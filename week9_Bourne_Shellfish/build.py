"""
Inflating pufferfish — physics-driven.
Body  : cloth membrane + internal pressure (Blender cloth 'Pressure').
        Wall stiffness varies by region (vertex group) = silicone wall thickness.
Spikes: rigid nubs glued to the skin. Their tilt is driven by how much the
        skin around them has stretched (current radius / rest radius):
        lying flat toward the tail when calm, standing on the normal when puffed.
"""
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/home/claude/puffer/out"
RENDER = "--render" in sys.argv
FRAMES = 120

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.fps = 24

# ---------------------------------------------------------------- body (sim)
mesh = bpy.data.meshes.new("PufferSim")
bm = bmesh.new()
bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=1.0)
for v in bm.verts:
    x, y, z = v.co
    x *= 1.5; y *= 0.85; z *= 0.78
    if x < 0:                                   # taper toward the tail
        k = 1 + 0.42 * x / 1.5
        y *= k; z *= k
    if z < 0:                                   # slightly flatter belly
        z *= 0.9
    v.co = Vector((x, y, z))
bm.to_mesh(mesh); bm.free()
for p in mesh.polygons: p.use_smooth = True

sim = bpy.data.objects.new("PufferSim", mesh)
scene.collection.objects.link(sim)

# rest position + spike selection stored as attributes (survive the cloth modifier)
rest = mesh.attributes.new("rest", 'FLOAT_VECTOR', 'POINT')
for i, v in enumerate(mesh.vertices): rest.data[i].vector = v.co

EYE_DIRS = []
for side in (1, -1):
    d = Vector((0.80, 0.52 * side, 0.30)).normalized()
    EYE_DIRS.append(d)

def surface_point(direction):
    """vertex of rest mesh closest to a ray from the origin"""
    best, bi = -2, 0
    for i, v in enumerate(mesh.vertices):
        c = v.co.normalized().dot(direction)
        if c > best: best, bi = c, i
    return bi

eye_vids = [surface_point(d) for d in EYE_DIRS]
mouth_vid = surface_point(Vector((1, 0, -0.12)).normalized())
fin_vids = [surface_point(Vector((0.05, s, -0.05)).normalized()) for s in (1, -1)]
tail_vid = min(range(len(mesh.vertices)), key=lambda i: mesh.vertices[i].co.x)

avoid = [(mesh.vertices[i].co, 0.42) for i in eye_vids] + \
        [(mesh.vertices[mouth_vid].co, 0.45)] + \
        [(mesh.vertices[i].co, 0.25) for i in fin_vids]

spike = mesh.attributes.new("spike", 'BOOLEAN', 'POINT')
random.seed(7)
order = list(range(len(mesh.vertices))); random.shuffle(order)
chosen = []
for i in order:
    co = mesh.vertices[i].co
    if co.x < -1.2: continue
    if any((co - c).length < r for c, r in avoid): continue
    if all((co - mesh.vertices[j].co).length > 0.19 for j in chosen):
        chosen.append(i)
for i in chosen: spike.data[i].value = True
print("spikes:", len(chosen))

# stiffness map  (1 = thick wall, 0 = thin wall)
vg = sim.vertex_groups.new(name="stiff")
for i, v in enumerate(mesh.vertices):
    x, y, z = v.co
    w = 0.08                                     # cheeks / belly: thin
    w = max(w, min(1, (-x - 0.4) / 0.7))          # tail region: thick
    w = max(w, 0.45 * max(0, min(1, (z - 0.25) / 0.4)))  # back: medium
    vg.add([i], w, 'REPLACE')

cloth = sim.modifiers.new("Cloth", 'CLOTH')
cs = cloth.settings
cs.quality = 10
cs.mass = 0.25
cs.air_damping = 2.0
cs.tension_stiffness = 4;  cs.tension_stiffness_max = 60
cs.compression_stiffness = 4; cs.compression_stiffness_max = 60
cs.shear_stiffness = 4;   cs.shear_stiffness_max = 40
cs.bending_stiffness = 0.3
cs.vertex_group_structural_stiffness = "stiff"
cs.vertex_group_shear_stiffness = "stiff"
cs.effector_weights.gravity = 0.0
cs.use_pressure = True
cs.pressure_factor = 1.0
cloth.collision_settings.use_collision = False
cloth.point_cache.frame_start = 1
cloth.point_cache.frame_end = FRAMES

PMAX = float(next((a.split("=")[1] for a in sys.argv if a.startswith("--p=")), "80"))
# noise timeline: calm -> siren -> holds -> quiet again (valve opens)
KEYS = [(1, 0), (14, 0), (40, PMAX), (68, PMAX), (104, 0), (FRAMES, 0)]
for f, p in KEYS:
    cs.uniform_pressure_force = p
    cs.keyframe_insert("uniform_pressure_force", frame=f)

sim.visible_camera = False; sim.visible_shadow = False
sim.visible_diffuse = False; sim.visible_glossy = False
sim.visible_transmission = False; sim.visible_volume_scatter = False

# ---------------------------------------------------------------- materials
def mat(name, color, rough=0.45, sss=0.0, attr_ramp=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (0.3, 0.2, 0.15)
        b.inputs["Subsurface Scale"].default_value = 0.08
    if attr_ramp:
        a = nt.nodes.new("ShaderNodeAttribute"); a.attribute_name = "rest"
        sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        r = nt.nodes.new("ShaderNodeValToRGB")
        r.color_ramp.elements[0].position = 0.42
        r.color_ramp.elements[1].position = 0.58
        r.color_ramp.elements[0].color = (*attr_ramp[0], 1)
        r.color_ramp.elements[1].color = (*attr_ramp[1], 1)
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.inputs["From Min"].default_value = -0.7; mr.inputs["From Max"].default_value = 0.7
        nt.links.new(a.outputs["Vector"], sep.inputs[0])
        nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], r.inputs["Fac"])
        nt.links.new(r.outputs["Color"], b.inputs["Base Color"])
    return m

M_BODY  = mat("Skin", (1, 1, 1), 0.5, 0.25, attr_ramp=((0.97, 0.93, 0.84), (0.96, 0.66, 0.24)))
M_SPIKE = mat("Spike", (0.88, 0.45, 0.16), 0.55, 0.2)
M_WHITE = mat("EyeWhite", (0.97, 0.97, 0.96), 0.15)
M_BLACK = mat("Pupil", (0.02, 0.02, 0.02), 0.08)
M_LID   = mat("Lid", (0.96, 0.66, 0.24), 0.5, 0.2)
M_LIP   = mat("Lip", (0.95, 0.38, 0.42), 0.35, 0.3)
M_FIN   = mat("Fin", (0.95, 0.52, 0.22), 0.4, 0.4)
mesh.materials.append(M_BODY)

# ---------------------------------------------------------------- visual body (geometry nodes)
vis_mesh = bpy.data.meshes.new("PufferBody")
vis = bpy.data.objects.new("PufferBody", vis_mesh)
scene.collection.objects.link(vis)
vis_mesh.materials.append(M_BODY)

ng = bpy.data.node_groups.new("PufferSkin", 'GeometryNodeTree')
ng.interface.new_socket("Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
ng.interface.new_socket("Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')
N, L = ng.nodes, ng.links
def node(t, **kw):
    n = N.new(t)
    for k, v in kw.items(): setattr(n, k, v)
    return n

gin  = node("NodeGroupInput"); gout = node("NodeGroupOutput")
oi   = node("GeometryNodeObjectInfo"); oi.inputs["Object"].default_value = sim
oi.transform_space = 'RELATIVE'
geo = oi.outputs["Geometry"]

sub = node("GeometryNodeSubdivisionSurface"); sub.inputs["Level"].default_value = 2
L.new(geo, sub.inputs["Mesh"])
setsm = node("GeometryNodeSetShadeSmooth")
L.new(sub.outputs[0], setsm.inputs["Geometry"])

# stretch = |pos| / |rest|
pos = node("GeometryNodeInputPosition")
ra  = node("GeometryNodeInputNamedAttribute", data_type='FLOAT_VECTOR'); ra.inputs["Name"].default_value = "rest"
lp  = node("ShaderNodeVectorMath", operation='LENGTH'); L.new(pos.outputs[0], lp.inputs[0])
lr  = node("ShaderNodeVectorMath", operation='LENGTH'); L.new(ra.outputs["Attribute"], lr.inputs[0])
div = node("ShaderNodeMath", operation='DIVIDE')
L.new(lp.outputs["Value"], div.inputs[0]); L.new(lr.outputs["Value"], div.inputs[1])
SMIN, SMAX = 1.03, 1.28
mr  = node("ShaderNodeMapRange", clamp=True)
mr.inputs["From Min"].default_value = SMIN; mr.inputs["From Max"].default_value = SMAX
L.new(div.outputs[0], mr.inputs["Value"])

# direction: tangent toward tail  -> normal
nrm = node("GeometryNodeInputNormal")
back = node("FunctionNodeInputVector"); back.vector = (-1, 0, 0.0)
dot = node("ShaderNodeVectorMath", operation='DOT_PRODUCT')
L.new(back.outputs[0], dot.inputs[0]); L.new(nrm.outputs[0], dot.inputs[1])
scl = node("ShaderNodeVectorMath", operation='SCALE')
L.new(nrm.outputs[0], scl.inputs[0]); L.new(dot.outputs["Value"], scl.inputs["Scale"])
tan = node("ShaderNodeVectorMath", operation='SUBTRACT')
L.new(back.outputs[0], tan.inputs[0]); L.new(scl.outputs[0], tan.inputs[1])
tann = node("ShaderNodeVectorMath", operation='NORMALIZE'); L.new(tan.outputs[0], tann.inputs[0])
# when flat, tilt slightly into the skin's outside (8%) so they don't clip
tflat = node("ShaderNodeVectorMath", operation='MULTIPLY_ADD')
L.new(nrm.outputs[0], tflat.inputs[0]); tflat.inputs[1].default_value = (0.03, 0.03, 0.03)
L.new(tann.outputs[0], tflat.inputs[2])
mix = node("ShaderNodeMix", data_type='VECTOR')
L.new(mr.outputs["Result"], mix.inputs["Factor"])
L.new(tflat.outputs[0], mix.inputs[4]); L.new(nrm.outputs[0], mix.inputs[5])
align = node("FunctionNodeAlignRotationToVector", axis='Z')
L.new(mix.outputs[1], align.inputs["Vector"])

cone = node("GeometryNodeMeshCone")
cone.inputs["Vertices"].default_value = 10
cone.inputs["Radius Top"].default_value = 0.012
cone.inputs["Radius Bottom"].default_value = 0.045
cone.inputs["Depth"].default_value = 0.20
ct = node("GeometryNodeTransform"); ct.inputs["Translation"].default_value = (0, 0, 0.085)
L.new(cone.outputs["Mesh"], ct.inputs["Geometry"])
csm = node("GeometryNodeSetShadeSmooth"); L.new(ct.outputs[0], csm.inputs["Geometry"])

sel = node("GeometryNodeInputNamedAttribute", data_type='BOOLEAN'); sel.inputs["Name"].default_value = "spike"
iop = node("GeometryNodeInstanceOnPoints")
L.new(geo, iop.inputs["Points"]); L.new(sel.outputs["Attribute"], iop.inputs["Selection"])
L.new(csm.outputs[0], iop.inputs["Instance"]); L.new(align.outputs[0], iop.inputs["Rotation"])
real = node("GeometryNodeRealizeInstances"); L.new(iop.outputs[0], real.inputs[0])
smat = node("GeometryNodeSetMaterial"); smat.inputs["Material"].default_value = M_SPIKE
L.new(real.outputs[0], smat.inputs["Geometry"])

join = node("GeometryNodeJoinGeometry")
L.new(setsm.outputs[0], join.inputs[0]); L.new(smat.outputs[0], join.inputs[0])
L.new(join.outputs[0], gout.inputs[0])
gm = vis.modifiers.new("Skin", 'NODES'); gm.node_group = ng

# ---------------------------------------------------------------- parts glued to the skin
def frame_at(vid):
    """orthonormal frame at a rest vertex: Z = outward normal, X = toward head (+X world)"""
    v = mesh.vertices[vid]
    n = v.normal.normalized()
    x = Vector((1, 0, 0)); x = (x - n * x.dot(n))
    if x.length < 1e-3: x = Vector((0, 0, 1)) - n * n.z
    x.normalize(); y = n.cross(x)
    M = Matrix((x, y, n)).transposed().to_4x4()
    M.translation = v.co
    return M

def neighbours(vid):
    ring = [e.vertices[0] if e.vertices[1] == vid else e.vertices[1]
            for e in mesh.edges if vid in e.vertices]
    return [vid] + ring[:2]

def glue(obj, vid):
    obj.parent = sim
    obj.parent_type = 'VERTEX_3'
    obj.parent_vertices = neighbours(vid)
    scene.frame_set(1)
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()
    P = obj.matrix_world.copy()
    obj.matrix_parent_inverse = P.inverted()
    obj.matrix_basis = frame_at(vid)

def uvs(name, r, scale, m, loc=(0, 0, 0), parent=None):
    me = bpy.data.meshes.new(name); b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=32, v_segments=16, radius=r)
    b.to_mesh(me); b.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.scale = scale; o.location = loc; o.data.materials.append(m)
    if parent: o.parent = parent
    return o

def key_vals(obj, path, pairs, idx=-1):
    for f, val in pairs:
        setattr(obj, path, val) if idx < 0 else None
        if idx >= 0:
            getattr(obj, path)[idx] = val
        obj.keyframe_insert(path, frame=f, index=idx)

# how "open"/puffed each part is over time (follows the pressure, slightly delayed)
OPEN = [(1, 0), (22, 0), (44, 1), (70, 1), (102, 0), (FRAMES, 0)]

for k, vid in enumerate(eye_vids):
    root = bpy.data.objects.new(f"Eye{k}", None); scene.collection.objects.link(root)
    glue(root, vid)
    white = uvs(f"EyeWhite{k}", 0.17, (1, 1, 0.55), M_WHITE, (0, 0, 0.02), root)
    pupil = uvs(f"Pupil{k}", 0.065, (1, 1, 0.5), M_BLACK, (0.02, 0, 0.105), root)
    # eyelid: skin-colored shell that rotates up off the eye
    lme = bpy.data.meshes.new(f"Lid{k}"); b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=32, v_segments=16, radius=0.185)
    bmesh.ops.delete(b, geom=[v for v in b.verts if v.co.y > 0.01], context='VERTS')
    b.to_mesh(lme); b.free()
    for p in lme.polygons: p.use_smooth = True
    lid = bpy.data.objects.new(f"Lid{k}", lme); scene.collection.objects.link(lid)
    lid.data.materials.append(M_LID); lid.parent = root
    lid.location = (0, 0, 0.015); lid.scale = (1.04, 1.04, 0.66)
    lid.rotation_mode = 'XYZ'
    sol = lid.modifiers.new("t", 'SOLIDIFY'); sol.thickness = 0.012
    # closed: lid half covers the front (rot X = -90deg about its hinge); open: tucked back
    sgn = 1 if k == 0 else -1
    for f, o in OPEN:
        lid.rotation_euler = (math.radians(-100 + 165 * o), 0, 0)
        lid.keyframe_insert("rotation_euler", frame=f, index=0)
    # lash line along the lid edge
    t = bpy.data.objects.new(f"Lash{k}", bpy.data.meshes.new(f"Lash{k}"))
    b = bmesh.new()
    bmesh.ops.create_circle(b, cap_ends=False, radius=0.186, segments=40)
    b.to_mesh(t.data); b.free()
    scene.collection.objects.link(t); t.parent = lid
    t.rotation_euler = (math.radians(90), 0, 0); t.scale = (1, 0.62, 1)
    sk = t.modifiers.new("skin", 'SKIN')
    for sv in t.data.skin_vertices[0].data: sv.radius = (0.016, 0.016)
    t.modifiers.new("s", 'SUBSURF')
    t.data.materials.append(M_BLACK)
    # painted eye also grows with the stretched skin
    for f, o in OPEN:
        root.scale = [0.85 + 0.35 * o] * 3
        root.keyframe_insert("scale", frame=f)

# lips (thin-wall region: puffs more than the rest)
lroot = bpy.data.objects.new("Mouth", None); scene.collection.objects.link(lroot)
glue(lroot, mouth_vid)
for k, zz in enumerate((0.07, -0.075)):
    lp_ = uvs(f"Lip{k}", 0.17, (0.55, 1.15, 0.42), M_LIP, (0, 0, 0), lroot)
    lp_.location = (zz, 0, 0.0)
    lp_.rotation_euler = (0, math.radians(90), 0)
for f, o in OPEN:
    lroot.scale = [0.55 + 0.75 * o] * 3
    lroot.keyframe_insert("scale", frame=f)

# fins: thick, non-inflating paddles
def fin_mesh(name, w, h):
    me = bpy.data.meshes.new(name); b = bmesh.new()
    pts = [(0, 0), (w, h * 0.55), (w * 1.05, 0), (w, -h * 0.55)]
    vs = [b.verts.new((x, y, 0)) for x, y in pts]
    b.faces.new(vs); b.to_mesh(me); b.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.modifiers.new("sol", 'SOLIDIFY').thickness = 0.04
    sb = o.modifiers.new("sub", 'SUBSURF'); sb.levels = sb.render_levels = 2
    for p in me.polygons: p.use_smooth = True
    o.data.materials.append(M_FIN)
    return o

for k, vid in enumerate(fin_vids):
    r = bpy.data.objects.new(f"FinRoot{k}", None); scene.collection.objects.link(r); glue(r, vid)
    f_ = fin_mesh(f"Fin{k}", 0.38, 0.34); f_.parent = r
    f_.rotation_euler = (math.radians(90), math.radians(-60), math.radians(180))
    f_.location = (0, 0, -0.02)
    # little flutter
    for fr in range(1, FRAMES + 1, 12):
        f_.rotation_euler[2] = math.radians(180 + (12 if (fr // 12) % 2 else -12))
        f_.keyframe_insert("rotation_euler", frame=fr, index=2)

r = bpy.data.objects.new("TailRoot", None); scene.collection.objects.link(r); glue(r, tail_vid)
tail = fin_mesh("Tail", 0.5, 0.62); tail.parent = r
tail.rotation_euler = (math.radians(90), math.radians(-90), 0)
tail.location = (0, 0, -0.1)
for fr in range(1, FRAMES + 1, 8):
    tail.rotation_euler[1] = math.radians(-90 + (14 if (fr // 8) % 2 else -14))
    tail.keyframe_insert("rotation_euler", frame=fr, index=1)

# ---------------------------------------------------------------- bake
bpy.context.view_layer.update()
override = {"scene": scene, "active_object": sim, "point_cache": cloth.point_cache}
with bpy.context.temp_override(**override):
    bpy.ops.ptcache.bake(bake=True)

dg = bpy.context.evaluated_depsgraph_get()
for f in (1, 30, 45, 60, 72, 85, 95, 104, 120):
    scene.frame_set(f)
    ev = sim.evaluated_get(bpy.context.evaluated_depsgraph_get())
    co = [v.co.copy() for v in ev.data.vertices]
    mn = Vector([min(c[i] for c in co) for i in range(3)])
    mx = Vector([max(c[i] for c in co) for i in range(3)])
    rr = [c.length / max(mesh.vertices[i].co.length, 1e-4) for i, c in enumerate(co)]
    rs = sorted(rr)
    print(f"f{f:3d} dims={tuple(round(a,2) for a in (mx-mn))} stretch p10={rs[len(rs)//10]:.2f} med={rs[len(rs)//2]:.2f} p90={rs[9*len(rs)//10]:.2f}")

# ---------------------------------------------------------------- stage
world = bpy.data.worlds.new("W"); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.50, 0.78, 0.82, 1); bg.inputs["Strength"].default_value = 0.45

floor_me = bpy.data.meshes.new("Floor"); b = bmesh.new()
bmesh.ops.create_grid(b, x_segments=1, y_segments=1, size=400); b.to_mesh(floor_me); b.free()
floor = bpy.data.objects.new("Floor", floor_me); scene.collection.objects.link(floor)
floor.location.z = -1.6
fm = mat("Floor", (0.50, 0.78, 0.82), 1.0); floor_me.materials.append(fm)

def light(name, kind, loc, energy, size, rot=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy
    if kind == 'AREA': ld.size = size
    o = bpy.data.objects.new(name, ld); scene.collection.objects.link(o)
    o.location = loc
    d = Vector((0, 0, 0)) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o
light("Key", 'AREA', (4, -4, 5), 420, 4)
light("Fill", 'AREA', (-2, -5, 4), 110, 5)
light("Rim", 'AREA', (-4, 4, 4), 380, 3)

cam_d = bpy.data.cameras.new("Cam"); cam_d.lens = 50
cam = bpy.data.objects.new("Cam", cam_d); scene.collection.objects.link(cam)
cam.location = (3.6, -7.2, 1.3)
cam.rotation_euler = (Vector((0.0, 0, -0.1)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

scene.render.engine = 'CYCLES'
scene.render.film_transparent = True
floor.is_shadow_catcher = True
scene.cycles.device = 'CPU'
scene.cycles.samples = 28
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 960, 720
scene.view_settings.view_transform = 'Standard'

bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/pufferfish.blend")
print("saved")

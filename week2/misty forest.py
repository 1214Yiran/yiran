"""
MISTY FOREST — a logic game
Run in VS Code terminal:  python3 misty_forest.py
"""
import random
import time

# ================= COLORS (ANSI) =================
GRAY = "\033[90m"
WHITE = "\033[97m"
GREEN = "\033[32m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

WIDTH = 60      # int — picture width
HEIGHT = 14     # int — picture height
SPEED = 0.012   # float — typing speed of text

# ================= ASCII ART (str) =================
ART_NONE = ""

ART_SWING = r"""
=====================
     |         |
     |         |
     |         |
     |_________|
"""

ART_CASE = r"""
   .-----------.
   | ||||||    |
   | ||||||    |
   '-----------'
"""

ART_BOX = r"""
  .---------------.
  |   ~ ~ ~ ~ ~   |
  |   [ _ _ _ ]   |
  '---------------'
"""

ART_PHOTO = r"""
 +-----------------+
 |  O     O     ?  |
 | /|\   /|\   /|\ |
 | / \   / \   / \ |
 +-----------------+
"""

ART_HOUSE = r"""
      /\
     /  \
    /____\
    | [] |
    |____|
"""

# ================= GAME STATE (dict) =================
state = {}


def new_game():
    """Reset every variable for a new game."""
    global state
    state = {
        "name": "",        # str
        "fog": 10,         # int  0–100
        "courage": 3,      # int
        "keys": 0,         # int
        "memories": 0,     # int
        "turns": 0,        # int
        "items": [],       # list
        "journal": [],     # list of clues
        "done": [],        # actions already used
        "tries": 0,        # wrong lock codes
        "torn": False,     # bool
    }


# ================= DRAWING =================
def clear():
    print("\033[2J\033[H", end="")


def draw_scene(art, seed):
    """Generate a forest picture. Trees are fixed by `seed`,
    fog is random and gets thicker as state['fog'] goes up."""
    rnd = random.Random(seed)
    grid = [[" "] * WIDTH for _ in range(HEIGHT)]
    kind = [[""] * WIDTH for _ in range(HEIGHT)]

    # trees
    for x in range(WIDTH):
        if rnd.random() < 0.16:
            top = rnd.randint(0, 5)
            for y in range(top, HEIGHT - 1):
                grid[y][x] = "|"
                kind[y][x] = "tree"
            if top > 0:
                grid[top - 1][x] = "^"
                kind[top - 1][x] = "tree"

    # ground
    for x in range(WIDTH):
        grid[HEIGHT - 1][x] = rnd.choice(["_", ".", ",", "_", "_"])
        kind[HEIGHT - 1][x] = "ground"

    # object in the middle
    if art != "":
        lines = art.strip("\n").split("\n")
        w = max(len(line) for line in lines)
        ox = (WIDTH - w) // 2
        oy = HEIGHT - 1 - len(lines)
        for i in range(len(lines)):
            for j in range(w):
                ch = lines[i][j] if j < len(lines[i]) else " "
                grid[oy + i][ox + j] = ch
                kind[oy + i][ox + j] = "obj" if ch != " " else ""

    # fog on top — arithmetic turns fog % into a probability
    density = state["fog"] / 100 * 0.8
    out = ""
    for y in range(HEIGHT):
        row = ""
        for x in range(WIDTH):
            k = kind[y][x]
            chance = density * 0.4 if k == "obj" else density
            if random.random() < chance:
                row += WHITE + random.choice("░░▒ ") + RESET
            elif k == "tree":
                row += GREEN + grid[y][x] + RESET
            elif k == "obj":
                row += YELLOW + grid[y][x] + RESET
            else:
                row += GRAY + grid[y][x] + RESET
        out += row + "\n"
    print(out, end="")


def hud():
    """Status bar."""
    filled = state["fog"] // 10
    bar = "#" * filled + "-" * (10 - filled)
    fog_color = RED if state["fog"] >= 70 else WHITE
    keys = "✦ " * state["keys"] + "· " * (3 - state["keys"])
    print(f"{fog_color}FOG [{bar}] {state['fog']}%{RESET}   "
          f"{YELLOW}KEYS {keys}{RESET}  "
          f"{RED}COURAGE {'♥' * state['courage']}{RESET}")
    print(GRAY + "-" * WIDTH + RESET)


def show(art, seed, title):
    clear()
    print(BOLD + CYAN + title.center(WIDTH) + RESET)
    draw_scene(art, seed)
    hud()


def say(text, color=""):
    for ch in text:
        print(color + ch + RESET, end="", flush=True)
        time.sleep(SPEED)
    print()


def pause():
    input(GRAY + "\n  (press Enter)" + RESET)


# ================= INPUT =================
def choose(options):
    """Show numbered options, return the number picked.
    Type J any time to read your journal."""
    print()
    for i in range(len(options)):
        print(f"  {i + 1}. {options[i]}")
    print(GRAY + "  (J = journal)" + RESET)
    while True:
        answer = input("> ").strip().lower()
        if answer == "j":
            show_journal()
        elif answer.isdigit() and 1 <= int(answer) <= len(options):
            return int(answer)
        else:
            print(f"  Type a number from 1 to {len(options)}.")


def show_journal():
    print(CYAN + "\n  --- JOURNAL ---" + RESET)
    if len(state["journal"]) == 0:
        print("  (empty)")
    for note in state["journal"]:
        print("  • " + note)
    if len(state["items"]) > 0:
        print("  Items: " + ", ".join(state["items"]))
    print()


# ================= RULES =================
def act(fog_cost):
    """Every action takes a turn and adds fog. Returns True if lost."""
    state["turns"] += 1
    state["fog"] = min(100, state["fog"] + fog_cost)
    return state["fog"] >= 100


def first_time(action):
    """True the first time an action is done (stops farming)."""
    if action not in state["done"]:
        state["done"].append(action)
        return True
    return False


def ask_leave():
    say("\nThe key is warm in your hand. Somewhere, the fog is thinner.")
    pick = choose(["Use the key and leave the fog", "Keep exploring"])
    return pick == 1


# ================= SCENES =================
# Each scene returns the name of the next scene (str).

def scene_intro():
    show(ART_NONE, 1, "M I S T Y   F O R E S T")
    name = input("\n  What is your name? ").strip()
    state["name"] = name if name != "" else "Stranger"
    say(f"\n  {state['name']}, you are walking a path you know well.")
    say("  Then a thick fog rolls in, swallowing the trees one by one.")
    say("  Sounds that don't belong to this forest drift in and out.", GRAY)
    say("  Find what the fog is hiding — before it takes you too.", YELLOW)
    pause()
    return "path"


def scene_path():
    while True:
        show(ART_NONE, 2, "THE PATH")
        say("  Fog everywhere. Far away, something creaks... and stops.")
        pick = choose([
            "Follow the creaking sound",
            "Call out: \"Is anyone there?\"",
            "Check your pockets",
            "Walk back the way you came",
        ])
        if pick == 1:
            if act(3):
                return "lost"
            return "swing"
        elif pick == 2:
            if act(5):
                return "lost"
            if first_time("call"):
                state["courage"] -= 1
                say("  A child's laugh answers. Then nothing.", RED)
            else:
                say("  Only your own voice comes back.")
        elif pick == 3:
            if act(2):
                return "lost"
            if "lighter" not in state["items"]:
                state["items"].append("lighter")
                say("  An old lighter. You don't remember buying it.", YELLOW)
            else:
                say("  Just the lighter.")
        else:
            if act(20):
                return "lost"
            say("  You walk and walk... and end up in the same place.", RED)
        pause()


def scene_swing():
    while True:
        show(ART_SWING, 3, "THE MOVING SWING")
        say("  An old swing, moving by itself. There is no wind.")
        pick = choose([
            "Stop the swing with your hand",
            "Count the chain links",
            "Sit on the swing",
            "Untie the rusted key from the chain",
        ])
        if act(3):
            return "lost"
        if pick == 1:
            if first_time("stop"):
                state["memories"] += 1
                say("  The seat is warm, as if someone just jumped off.", YELLOW)
            else:
                say("  It starts moving again as soon as you let go.")
        elif pick == 2:
            if first_time("links"):
                state["journal"].append("SWING: 7 links on each chain.")
                say("  1, 2, 3 ... 7 links on each chain. (written in journal)", CYAN)
            else:
                say("  Still 7.")
        elif pick == 3:
            if first_time("sit"):
                state["memories"] += 1
                state["courage"] -= 1
                say("  You remember pushing someone small. Higher! Higher!", YELLOW)
                say("  Your chest hurts.", RED)
            else:
                say("  The chains are cold.")
        else:
            state["keys"] += 1
            say("  You found KEY I.", YELLOW)
            if ask_leave():
                return "ending1"
            return "case"
        pause()


def scene_case():
    found = False
    while not found:
        show(ART_NONE, 4, "CLICK ... CLICK ...")
        say("  A lighter clicks somewhere in the dark. It never catches.")
        pick = choose([
            "Click your own lighter",
            "Dig through the wet leaves",
            "Follow the smell of smoke",
            "Shout your child's name",
        ])
        if act(4):
            return "lost"
        if pick == 1:
            if "lighter" in state["items"]:
                say("  Your flame catches. Something metal shines in the leaves!", YELLOW)
                found = True
            else:
                say("  You have nothing to light.")
        elif pick == 2:
            if random.randint(1, 3) == 1:      # 1 in 3 chance
                say("  Your fingers hit something cold and metal.", YELLOW)
                found = True
            else:
                state["fog"] = min(100, state["fog"] + 8)
                say("  Only mud and leaves. The fog creeps closer.", RED)
        elif pick == 3:
            if first_time("smoke"):
                state["memories"] += 1
                say("  A bench. You used to sit here and smoke, watching the swing.", YELLOW)
            else:
                say("  The bench is empty.")
        else:
            state["courage"] = max(0, state["courage"] - 1)
            say("  You open your mouth... but you can't remember the name.", RED)
        pause()

    show(ART_CASE, 5, "THE CIGARETTE CASE")
    say("  Your cigarette case. The dent in the corner is from the day you ran.")
    say("  It held 10 cigarettes. 4 are gone.")
    say("  Inside the lid, scratched: \"HALF OF WHAT IS LEFT\"", CYAN)
    state["journal"].append("CASE: 10 cigarettes, 4 gone. 'Half of what is left.'")
    state["keys"] += 1
    say("  Under the cigarettes: KEY II.", YELLOW)
    if ask_leave():
        return "ending2"
    return "photo"


def scene_photo():
    code = "735"   # 7 links, (10-4)/2 = 3, 20 notes / 4 = 5
    while True:
        show(ART_BOX, 6, "THE MUSIC BOX")
        say("  A wooden music box with a 3-digit lock.")
        say("  Engraved on the lid:  SWING · SMOKE · SONG", CYAN)
        pick = choose([
            "Listen to the music box",
            "Try a code on the lock",
            "Smash the box open",
            "Read your journal",
        ])
        if act(4):
            return "lost"
        if pick == 1:
            say("  The song is 4 notes long. It plays 20 notes, then stops.")
            if first_time("song"):
                state["journal"].append("SONG: 4-note melody, 20 notes played.")
        elif pick == 2:
            guess = input("  Enter 3 digits: ").strip()
            if guess == code:
                say("  *click* The lid opens.", YELLOW)
                break
            else:
                state["tries"] += 1
                state["fog"] = min(100, state["fog"] + 10)
                say("  Wrong. The fog thickens.", RED)
                if state["tries"] >= 2:
                    say("  (Hint: one number from each word, in order.)", GRAY)
        elif pick == 3:
            if state["courage"] >= 2:
                state["torn"] = True
                say("  You smash it. The photo inside tears in half.", RED)
                break
            else:
                say("  Your hands are shaking too much.", RED)
        else:
            show_journal()
        pause()

    state["keys"] += 1
    show(ART_PHOTO, 7, "THE OLD PHOTO")
    say("  A family photo. A man, a woman — and a child whose face is blurred.")
    say("  Taped to the back: KEY III.", YELLOW)
    pause()
    return "final"


# ================= ENDINGS =================
def scene_ending1():
    show(ART_HOUSE, 8, "ENDING 1 — THE CLEAR PATH")
    say("  The fog opens. You walk home.")
    say("  Everything is in its place — but every evening you hear")
    say("  a swing creaking that isn't there.", GRAY)
    return "end"


def scene_ending2():
    show(ART_HOUSE, 9, "ENDING 2 — THE SCREAM")
    say("  Holding the case, it all comes back:")
    say("  smoke, the bench, a child laughing on the swing...")
    say("  then a scream. You dropped the case. You ran. The swing was empty.", RED)
    return "end"


def scene_final():
    state["fog"] = 0
    if state["torn"]:
        show(ART_PHOTO, 7, "ENDING 3 — THE TORN PHOTO")
        say("  The fog lifts. You hold half a photo.")
        say("  The half with your child is gone. You will spend years looking for it.", RED)
    elif state["memories"] >= 2 and state["turns"] <= 25:
        show(ART_PHOTO, 7, "TRUE ENDING — THEIR FACE")
        say("  The blur clears. It is your child. It always was.")
        say("  For one moment, a small warm hand holds yours.", YELLOW)
        say("  You still can't bring them back — but you will never forget their face.")
    else:
        show(ART_PHOTO, 7, "FINAL ENDING — THE WAY OUT")
        say("  The fog lifts. You have the photo, but the face stays blurred.")
        say("  You didn't remember enough. Maybe next time.", GRAY)
    return "end"


def scene_lost():
    state["fog"] = 100
    show(ART_NONE, 10, "LOST IN THE FOG")
    say("  Everything turns white. You can't see your own hands.", RED)
    say(f"  You found {state['keys']} of 3 keys.")
    return "end"


SCENES = {
    "intro": scene_intro,
    "path": scene_path,
    "swing": scene_swing,
    "case": scene_case,
    "photo": scene_photo,
    "final": scene_final,
    "ending1": scene_ending1,
    "ending2": scene_ending2,
    "lost": scene_lost,
}


# ================= MAIN =================
def play():
    new_game()
    scene = "intro"
    while scene != "end":
        scene = SCENES[scene]()
    print(GRAY + f"\n  Turns: {state['turns']}   Memories: {state['memories']}/3" + RESET)


def main():
    again = "y"
    while again == "y" or again == "yes":
        play()
        again = input("\n  Play again? (y/n): ").strip().lower()
    print("  Goodbye.")


if __name__ == "__main__":
    main()

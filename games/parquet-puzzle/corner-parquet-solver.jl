using JuMP
using HiGHS
# using CPLEX
using MathOptInterface
const MOI = MathOptInterface

# Identify L-shaped triomino pieces: exactly 3 cells, orth-adjacent in an L.
# For each piece, find the corner (degree 2 in 4-neighborhood within the piece).
struct Piece
    center::Tuple{Int,Int}
    outers::NTuple{2,Tuple{Int,Int}}
end

const PATTERN_STR = """
aabccddeeffghhi
ajbbcmdnefgghii
kjjlmmnnoopprrq
kklluvvwoxpyrqq
sttuuvEwwxxyyzz
sstCCDEEFFGHHIz
AABBCDDJJFGGHII
AKBMNNOJPPQRRSS
LKKMMNOOPVQQRTS
LL..//+-VV\$UUTT
WW?./++--\$\$U&%%
XW??||[]]@@€&&%
XX!!|[[]==@€€((
YYZ!><<:=;_,,)(
YZZ>><::;;__,))
"""

const INITIAL_STR = "9,8,5,8,9,6,7,8,9,8,7,4,9,8,6,7,6,7,6,7,8,5,6,7,6,5,6,7,5,7,5,9,8,4,5,9,7,8,9,8,9,8,9,8,6,7,6,5,6,7,6,4,5,7,5,7,5,7,5,7,5,8,9,8,9,5,7,6,4,6,4,6,4,8,9,7,6,7,6,7,6,9,8,7,9,5,8,9,5,7,9,8,9,8,5,8,7,6,5,8,7,6,7,6,4,7,6,7,4,7,9,5,4,7,6,5,8,9,8,9,5,9,8,6,5,8,7,6,5,8,7,6,7,6,7,7,6,7,9,7,6,5,4,7,9,5,9,8,9,8,8,9,5,8,5,8,9,6,5,6,7,6,7,5,7,5,7,6,4,7,6,7,8,7,8,9,5,9,8,6,6,4,8,9,5,8,9,6,9,6,7,6,4,7,9,7,5,7,6,7,6,5,7,8,5,8,5,9,5,8,6,8,9,8,9,4,8,9,6,7,9,7,8,7,6"

"""
Solve a 15x15 parquet puzzle where each piece is an L-shaped triomino (2x2 minus one cell),
subject to:
  - Allowed digits per cell: 4..9
  - No equal adjacent digits (including diagonals) anywhere on the grid
  - For each L-shaped piece, the corner (middle) cell value B is the largest (>= A+1 and >= C+1)
  - Objective: maximize sum over pieces of (A + C) / B, where A and C are the two outer cells

The pattern_str identifies pieces by repeating the same character exactly 3 times
in an L-shape (orthogonal adjacency). For each such label, we detect the unique
corner cell (degree 2 within the piece) and the two outer cells (degree 1 each).

We linearize the objective by introducing y[i,j,v,b] binaries that select both the
cell value v and the piece corner value b. We add z[p,b] to force all three cells
of piece p to share the same b, and to force the corner cell's value to equal b.
The outer cells contribute v/b via fixed coefficients.

Optional warm start:
    - Provide an initial 15x15 assignment as a second argument initial_str (string).
        Accepts either:
            * 225 comma-separated values (row-major), or
            * a 15-line string of characters where digits 4..9 specify initial values and '.' means unknown.
        The start is used as a MIP start by setting variable start values for y and z.
        If your solver supports MIP starts (e.g., CPLEX, Gurobi), it can continue from this solution.
"""
function solve_corner_parquet(pattern_str::String, initial_str::Union{Nothing,String}=nothing)
    model = Model(HiGHS.Optimizer)
    # model = Model(CPLEX.Optimizer)
    # JuMP.set_silent(model)

    # set_optimizer_attribute(model, "time_limit", 1200.0)         # seconds
    set_optimizer_attribute(model, "mip_rel_gap", 1e-4)
    set_optimizer_attribute(model, "threads", 0)               # all cores

    # For timing
    t_start = time()

    allowed_vs = 2:9

    # Parse pattern into a 2D char array (rows x cols)
    # Expecting a 15x15 grid
    pattern = permutedims(hcat(collect.(split(pattern_str))...))
    H, W = size(pattern)
    @assert H == 15 && W == 15 "Pattern must be 15x15"

    # Group positions by label
    labels = Dict{Char, Vector{Tuple{Int,Int}}}()
    for i in 1:H, j in 1:W
        c = pattern[i,j]
        if c == '\n' || c == ' ' # skip any stray whitespace
            continue
        end
        push!(get!(labels, c, Tuple{Int,Int}[]), (i,j))
    end

    function is_adj4(a::Tuple{Int,Int}, b::Tuple{Int,Int})
        return abs(a[1]-b[1]) + abs(a[2]-b[2]) == 1
    end

    pieces = Piece[]
    for (lab, cells) in labels
        if length(cells) != 3
            continue  # ignore non-triomino labels
        end
        # Degree within piece under 4-neighborhood
        deg = Dict{Tuple{Int,Int},Int}()
        for c in cells
            deg[c] = 0
        end
        for a in cells, b in cells
            if a != b && is_adj4(a,b)
                deg[a] = deg[a] + 1
            end
        end
        # Expect one cell degree 2 (corner), two cells degree 1 (outer)
        centers = [(i,j) for (i,j) in cells if deg[(i,j)] == 2]
        outers  = [(i,j) for (i,j) in cells if deg[(i,j)] == 1]
        if length(centers) == 1 && length(outers) == 2
            push!(pieces, Piece(centers[1], (outers[1], outers[2])))
        else
            error("Label '$lab' is not a valid L-shaped triomino (deg pattern not 2,1,1)")
        end
    end

    P = length(pieces)
    if P == 0
        error("No valid L-shaped triomino pieces detected in pattern.")
    end

    # Map each cell to its piece index (for warm starts)
    cell_to_piece = Dict{Tuple{Int,Int}, Int}()
    for (p, piece) in enumerate(pieces)
        cell_to_piece[piece.center] = p
        cell_to_piece[piece.outers[1]] = p
        cell_to_piece[piece.outers[2]] = p
    end

    # Decision variables:
    # y[i,j,v,b] = 1 if cell (i,j) takes value v and its piece's center value is b
    @variable(model, y[1:H, 1:W, allowed_vs, allowed_vs], Bin)

    # z[p,b] = 1 if piece p uses corner value b (shared across its 3 cells)
    @variable(model, z[1:P, allowed_vs], Bin)

    # Each cell must pick exactly one (v,b) pair
    for i in 1:H, j in 1:W
        @constraint(model, sum(y[i,j,v,b] for v in allowed_vs, b in allowed_vs) == 1)
    end

    # For each piece, enforce a single chosen center value b
    for p in 1:P
        @constraint(model, sum(z[p,b] for b in allowed_vs) == 1)
    end

    # Tie all 3 cells of a piece to the same chosen b:
    # For each cell c in piece p and each b: sum_v y[c,v,b] == z[p,b]
    for (p, piece) in enumerate(pieces)
        cells_p = (piece.center, piece.outers[1], piece.outers[2])
        for b in allowed_vs
            for (ci, cj) in cells_p
                @constraint(model, sum(y[ci,cj,v,b] for v in allowed_vs) == z[p,b])
            end
        end
    end

    # Force the piece corner cell's value to equal its chosen b:
    # For center cell c*, y[c*,b,b] == z[p,b] and y[c*,v!=b,b] == 0
    for (p, piece) in enumerate(pieces)
        (ci, cj) = piece.center
        for b in allowed_vs
            # v == b channel must equal z[p,b]
            @constraint(model, y[ci,cj,b,b] == z[p,b])
            # all other v != b must be 0 on channel b
            for v in allowed_vs
                if v != b
                    @constraint(model, y[ci,cj,v,b] == 0)
                end
            end
        end
    end

    # Corner (center) is largest by at least 1 vs each outer: A+1 <= B and C+1 <= B
    # Left side is the outer cell value; right side is sum_b b*z[p,b]
    # Cell value as linear form: sum_{v,b} v*y[i,j,v,b]
    for (p, piece) in enumerate(pieces)
        rhs = sum(b * z[p,b] for b in allowed_vs)
        for (oi, oj) in piece.outers
            @constraint(model, sum(v * y[oi,oj,v,b] for v in allowed_vs, b in allowed_vs) + 1 <= rhs)
        end
    end

    # No two adjacent (including diagonals) cells share the same value
    # Use 2x2 pattern: for each v, any 2x2 block can have at most one cell equal to v
    for i in 1:H-1, j in 1:W-1, v in allowed_vs
        @constraint(model, (
            sum(y[i,  j,  v, b] for b in allowed_vs) +
            sum(y[i+1,j,  v, b] for b in allowed_vs) +
            sum(y[i,  j+1,v, b] for b in allowed_vs) +
            sum(y[i+1,j+1,v, b] for b in allowed_vs)
        ) <= 1)
    end

    # Objective: maximize sum over pieces of (A + C)/B
    # Linearized as sum_{outer cell o in p} sum_{v,b} (v/b) * y[o,v,b]
    @objective(model, Max, sum(
        (v / b) * y[oi,oj,v,b]
        for piece in pieces,
            (oi,oj) in (piece.outers[1], piece.outers[2]),
            v in allowed_vs,
            b in allowed_vs
    ))

    # Optional: parse and apply a warm-start from an initial assignment
    if initial_str !== nothing
        # Build initial value matrix vals[H,W] with entries in 0 or 4..9
        vals = zeros(Int, H, W)
        if occursin(",", initial_str)
            items = [strip(s) for s in split(initial_str, ",") if !isempty(strip(s))]
            @assert length(items) == H*W "Initial CSV must have exactly $(H*W) values"
            k = 1
            for i in 1:H, j in 1:W
                s = items[k]; k += 1
                if s == "." || s == "0"
                    vals[i,j] = 0
                else
                    vals[i,j] = try
                        parse(Int, s)
                    catch
                        0
                    end
                end
            end
        else
            init_mat = permutedims(hcat(collect.(split(initial_str))...))
            @assert size(init_mat,1) == H && size(init_mat,2) == W "Initial grid string must be 15x15"
            for i in 1:H, j in 1:W
                c = init_mat[i,j]
                vals[i,j] = (c == '.' || c == '0') ? 0 : (isdigit(c) ? parse(Int, string(c)) : 0)
            end
        end

        # Set starts for z using piece centers when available
        chosenB = Dict{Int, Union{Nothing,Int}}()
        for (p, piece) in enumerate(pieces)
            (ci, cj) = piece.center
            B0 = vals[ci, cj]
            if B0 in allowed_vs
                chosenB[p] = B0
                set_start_value(z[p, B0], 1.0)
            else
                chosenB[p] = nothing
            end
        end

        # Set starts for y at cells where we know v, choosing b consistently for piece cells
        for i in 1:H, j in 1:W
            v0 = vals[i,j]
            if v0 in allowed_vs
                if haskey(cell_to_piece, (i,j))
                    p = cell_to_piece[(i,j)]
                    b0 = get(chosenB, p, nothing)
                    if b0 !== nothing
                        set_start_value(y[i,j,v0,b0], 1.0)
                    end
                else
                    # Not part of any piece: pick an arbitrary b channel (use b=v0)
                    set_start_value(y[i,j,v0,v0], 1.0)
                end
            end
        end
    end

    optimize!(model)

    t_end = time()
    elapsed = t_end - t_start

    status = termination_status(model)
    if JuMP.has_values(model)
        # Extract best incumbent found (optimal or time-limited feasible)
        sol = value.(y)
        grid = zeros(Int, H, W)
        for i in 1:H, j in 1:W
            # recover chosen v by marginalizing over b
            best_v = 0
            best_val = -1.0
            for v in allowed_vs
                s = sum(sol[i,j,v,b] for b in allowed_vs)
                if s > best_val
                    best_val = s
                    best_v = v
                end
            end
            grid[i,j] = best_v
        end
        csv = join(vec(transpose(grid)), ",")
        obj = objective_value(model)
        println("Status: ", status)
        println("Best incumbent objective: ", round(obj, digits=6))
        println("Time: ", round(elapsed, digits=3), " s")
        return (score=obj, csv=csv)
    else
        println("Status: ", status)
        println("No feasible incumbent found. Time: ", round(elapsed, digits=3), " s")
        return (score=nothing, csv=nothing)
    end
end

return solve_corner_parquet

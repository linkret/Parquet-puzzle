using JuMP
using HiGHS
using Random

# 400 known tilings of 9x9 with 1x3 and 3x1 tiles - proven by Knuth et. al.

# The parquet tiling from google docs:
# aaajklwww
# bcdjklxxx
# bcdjklyzA
# bcdmmmyzA
# eeennnyzA
# fghooovvv
# fghpqrrru
# fghpqsssu
# iiipqtttu

# debug pattern for 1234 random seed:
const PATTERN_STR = """
aaabcccde
fghbijkde
fghbijkde
fghlijkmn
opqlrstmn
opqlrstmn
opqurstvw
xxxuyyyvw
zzzuAAAvw
"""

function solve_parquet_puzzle(pattern_str::String, central_value::Int = 0)
    model = Model(HiGHS.Optimizer)
    JuMP.set_silent(model)

    # For timing
    t_start = time()

    # The binary approach keeps the model linear
    @variable(model, y[1:9, 1:9, 1:9], Bin)

    # Each cell must have exactly one value from 1 to 9
    for i in 1:9, j in 1:9
        @constraint(model, sum(y[i, j, v] for v in 1:9) == 1)
    end

    # Fix the central cell's value to the specified central_value (if provided)
    if central_value != 0
        @constraint(model, y[5, 5, central_value] == 1)
    end

    # No two adjacent cells (including diagonals) can have the same value.
    # These 2x2 constraints are a compact way to cover all adjacency and diagonal constraints.
    for i in 1:8, j in 1:8, v in 1:9
        @constraint(model, y[i,j,v] + y[i+1,j,v] + y[i,j+1,v] + y[i+1,j+1,v] <= 1)
    end

    # Pattern constraints from the provided pattern string:
    # Middle cell must be greater than its neighbors in the pattern
    pattern = permutedims(hcat(collect.(split(pattern_str))...))

    # Helper for value of a cell
    cell_value(i, j) = sum(v * y[i, j, v] for v in 1:9)

    # Horizontal patterns
    for i in 1:9, j in 1:7
        if pattern[i, j] == pattern[i, j+1] == pattern[i, j+2]
            @constraint(model, cell_value(i, j+1) >= cell_value(i, j) + 1)
            @constraint(model, cell_value(i, j+1) >= cell_value(i, j+2) + 1)
            # Outer two cells must have different values
            for v in 1:9
                @constraint(model, y[i, j, v] + y[i, j+2, v] <= 1)
            end
        end
    end

    # Vertical patterns
    for i in 1:7, j in 1:9
        if pattern[i, j] == pattern[i+1, j] == pattern[i+2, j]
            # Middle cell must be greater than its neighbors in the pattern
            @constraint(model, cell_value(i+1, j) >= cell_value(i, j) + 1)
            @constraint(model, cell_value(i+1, j) >= cell_value(i+2, j) + 1)
            # Outer two cells must have different values
            for v in 1:9
                @constraint(model, y[i, j, v] + y[i+2, j, v] <= 1)
            end
        end
    end

    # Maximize the sum of all values in the grid.
    @objective(model, Max, sum(v * y[i, j, v] for i in 1:9, j in 1:9, v in 1:9))

    optimize!(model)

    t_end = time()
    elapsed = t_end - t_start

    status = termination_status(model)
    if status == MOI.OPTIMAL
        solution = value.(y)
        grid = zeros(Int, 9, 9)
        for i in 1:9, j in 1:9
            for v in 1:9
                if solution[i, j, v] > 0.5
                    grid[i, j] = v
                end
            end
        end
        csv = join(vec(transpose(grid)), ",")
        score = objective_value(model)
        println("Status: OPTIMAL")
        println("Score: ", round(score))
        println("Time taken: ", round(elapsed, digits=3), " seconds")
        return (score=score, csv=csv)
    else
        println("Status: ", status)
        println("No optimal solution found. Time taken: ", round(elapsed, digits=3), " seconds")
        return (score=nothing, csv=nothing)
    end
end

# Load and sample patterns from a file, then solve them to check for digits 1, 2, or 3
function check_no_123_in_random_patterns(pattern_file::String, nchecks::Int=100)
    # Load patterns from file
    patterns = open(pattern_file) do io
        eval(Meta.parse(read(io, String)))
    end
    for i in 1:nchecks
        pat = rand(patterns)
        result = solve_parquet_puzzle(pat, 0)
        if result[:csv] === nothing
            println("No solution for pattern:")
            println(pat)
            continue
        end
        digits = split(result[:csv], ",")
        if any(x -> x == "1" || x == "2" || x == "3", digits)
            println("Digits 1, 2, or 3 found in solution for pattern:")
            println(pat)
            println("Solution: ", result[:csv])
            return
        else
            println("Check passed for pattern.")
        end
    end
    println("All checks passed for $nchecks random patterns.")
end

# Run the function with the original pattern
# solve_parquet_puzzle(PATTERN_STR, 0)
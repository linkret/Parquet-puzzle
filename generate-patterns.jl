include("parquet-solver.jl")
using JSON3

function enumerate_and_solve_patterns(pattern_file::String, out_file::String, n::Int=1000, start_row::Int=1)
    # Read patterns from file (assumes a JSON array of strings)
    patterns = open(pattern_file) do io
        JSON3.read(read(io, String))
    end
    # Load existing dict if file exists
    if isfile(out_file)
        println("Loading existing dictionary from $out_file...")
        dict = load_dict(out_file)
    else
        dict = Dict{String, Tuple{Float64, String}}()
    end
    start_row = length(dict) + 1
    last_row = min(start_row + n - 1, length(patterns))
    for i in start_row:last_row
        pat = patterns[i]
        result = solve_parquet_puzzle(pat, 0)
        if result[:score] !== nothing && result[:csv] !== nothing
            dict[pat] = (result[:score], result[:csv])
            println("Solved pattern $i: score=$(result[:score])")
        else
            println("No solution for pattern $i")
        end
    end
    save_dict(dict, out_file)
    return dict
end

function save_dict(dict, out_file)
    # Convert tuple values to arrays for JSON compatibility
    dict_json = Dict(k => [v[1], v[2]] for (k, v) in dict)
    open(out_file, "w") do io
        write(io, JSON3.write(dict_json))
    end
end

function load_dict(in_file)
    dict_json = open(in_file) do io
        JSON3.read(read(io, String))
    end
    # Convert arrays back to tuples, and keys to String
    Dict(string(k) => (v[1], v[2]) for (k, v) in dict_json)
end

# Example usage:
# dict = enumerate_and_solve_patterns("all_parquet_patterns.txt", "parquet_solutions.txt", 1000) # first 1000
# dict2 = enumerate_and_solve_patterns("all_parquet_patterns.txt", "parquet_solutions.txt", 1000) # solves next 1000 patterns not yet in dict
# loaded = load_dict("parquet_solutions.txt")

using Printf

function enumerate_all_parquet_patterns()
    grid = fill('.', 9, 9)
    chars = vcat(collect('a':'z'), collect('A':'Z'), collect('0':'9'), ['@', '#', '$', '%', '&', '*', '+', '-', '=', '?', '/', '~', '^', ':', ';', '!', '<', '>', '[', ']', '{', '}', '|', '_'])
    patterns = String[]
    char_idx = Ref(1)

    function find_first_empty()
        for r in 1:9, c in 1:9
            if grid[r, c] == '.'
                return (r, c)
            end
        end
        return nothing
    end

    function dfs()
        pos = find_first_empty()
        if pos === nothing
            # Save the pattern as a string
            push!(patterns, join([String(grid[i, :]) for i in 1:9], "\n"))
            return
        end
        r, c = pos
        # Try horizontal
        if c <= 7 && grid[r, c+1] == '.' && grid[r, c+2] == '.'
            ch = chars[char_idx[]]
            char_idx[] += 1
            grid[r, c:c+2] .= ch
            dfs()
            char_idx[] -= 1
            grid[r, c:c+2] .= '.'
        end
        # Try vertical
        if r <= 7 && grid[r+1, c] == '.' && grid[r+2, c] == '.'
            ch = chars[char_idx[]]
            char_idx[] += 1
            grid[r:r+2, c] .= ch
            dfs()
            char_idx[] -= 1
            grid[r:r+2, c] .= '.'
        end
    end

    dfs()
    @printf "Found %d patterns\n" length(patterns)
    open("all_parquet_patterns.txt", "w") do io
        println(io, "[\n" * join([repr(s) for s in patterns], ",\n") * "\n]")
    end
    return patterns
end

# To run and dump all patterns:
# enumerate_all_parquet_patterns()
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
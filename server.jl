using HTTP
using Sockets
using JSON3
using Random

include("parquet-solver.jl")

const INDEX_PATH = joinpath(@__DIR__, "index.html")

function load_index()
    return read(INDEX_PATH, String)
end

const INDEX_HTML = Ref("")

# --- Random 9x9 tiling generator (1x3 / 3x1) ---
function generate_random_tiling()
    grid = fill('.', 9, 9)
    chars = vcat(collect('a':'z'), collect('A':'Z'))
    char_idx = Ref(1)

    find_first_empty() = begin
        for r in 1:9, c in 1:9
            if grid[r, c] == '.'
                return (r, c)
            end
        end
        return nothing
    end

    next_char!() = begin
        ch = chars[char_idx[]]
        char_idx[] += 1
        ch
    end

    function solve()
        pos = find_first_empty()
        pos === nothing && return true
        r, c = pos
        for orientation in randperm(2)
            if orientation == 1
                if c <= 7 && grid[r, c+1] == '.' && grid[r, c+2] == '.'
                    ch = next_char!()
                    grid[r, c:c+2] .= ch
                    solve() && return true
                    char_idx[] -= 1
                    grid[r, c:c+2] .= '.'
                end
            else
                if r <= 7 && grid[r+1, c] == '.' && grid[r+2, c] == '.'
                    ch = next_char!()
                    grid[r:r+2, c] .= ch
                    solve() && return true
                    char_idx[] -= 1
                    grid[r:r+2, c] .= '.'
                end
            end
        end
        return false
    end

    solve() || error("Failed to generate a tiling")
    rows = [String(grid[i, :]) for i in 1:9]
    # println(join(rows, "\n"))
    return (; pattern = join(rows, "\n"), rows)
end

function handler(req::HTTP.Request)
    if req.method == "GET"
        path = String(req.target)
        if path == "/" || path == "/index.html"
            return HTTP.Response(200, ["Content-Type" => "text/html; charset=utf-8"], INDEX_HTML[])
        elseif path == "/random-tiling"
            patt = generate_random_tiling()
            body = JSON3.write(patt)
            return HTTP.Response(200, ["Content-Type" => "application/json"], body)
        elseif path == "/favicon.ico"
            return HTTP.Response(204) # No Content
        else
            return HTTP.Response(404, "Not Found")
        end
    elseif req.method == "POST"
        path = String(req.target)
        if path == "/calculate-optimal"
            body_str = String(req.body)
            data = try
                JSON3.read(body_str)
            catch err
                return HTTP.Response(400, "Invalid JSON: $(err)")
            end
            if !haskey(data, :pattern)
                return HTTP.Response(400, "Missing 'pattern'")
            end
            pattern_str = data[:pattern]
            result = solve_parquet_puzzle(pattern_str)
            if result[:score] === nothing || result[:csv] === nothing
                return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="No optimal solution found")))
            end
            return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=true, score=result[:score], csv=result[:csv])))
        elseif path == "/submit-grid"
            body_str = String(req.body)
            data = try
                JSON3.read(body_str)
            catch err
                return HTTP.Response(400, "Invalid JSON: $(err)")
            end
            if !haskey(data, :grid)
                return HTTP.Response(400, "Missing 'grid'")
            end
            # Convert JSON3.Array to standard Julia Array of Arrays
            grid = [collect(row) for row in collect(data[:grid])]
            # Validate grid: must be 9x9, all entries 1-9 or empty
            if !(grid isa Vector) || length(grid) != 9 || any(x->!(x isa Vector) || length(x)!=9, grid)
                # Add debug info to error message
                gridtype = string(typeof(grid))
                gridlen = try length(grid) catch _ 0 end
                subtypes = try join([string(typeof(x))*":"*string(length(x)) for x in grid], ", ") catch _ "?" end
                msg = "Grid must be 9x9 array. Got type: $gridtype, length: $gridlen, subtypes: [$subtypes]"
                return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg=msg)))
            end
            vals = Array{Union{Int,Nothing}}(undef, 9, 9)
            for i in 1:9, j in 1:9
                x = grid[i][j]
                if x === nothing || x == ""
                    vals[i,j] = nothing
                elseif x isa Integer
                    if 1 <= x <= 9
                        vals[i,j] = x
                    else
                        return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="All digits must be 1-9")))
                    end
                elseif x isa AbstractString
                    try
                        v = parse(Int, x)
                        if 1 <= v <= 9
                            vals[i,j] = v
                        else
                            return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="All digits must be 1-9")))
                        end
                    catch
                        return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="Invalid cell value: $x")))
                    end
                else
                    return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="Invalid cell value type")))
                end
            end
            # Check adjacency (including diagonals)
            for i in 1:9, j in 1:9
                v = vals[i,j]
                if v === nothing; continue; end
                for di in -1:1, dj in -1:1
                    if di == 0 && dj == 0; continue; end
                    ni, nj = i+di, j+dj
                    if 1 <= ni <= 9 && 1 <= nj <= 9
                        v2 = vals[ni, nj]
                        if v2 !== nothing && v2 == v
                            return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="Adjacent cells (including diagonals) cannot have the same value")))
                        end
                    end
                end
            end
            # Get the tiling pattern from the last generated pattern
            # (Assume the frontend sends the pattern string as 'pattern' in the POST body)
            if !haskey(data, :pattern)
                return HTTP.Response(400, "Missing 'pattern'")
            end
            pattern_str = data[:pattern]
            pattern = [collect(strip(row)) for row in split(pattern_str, '\n')]
            # For each tile (label), check the 1x3 or 3x1 rule
            label_coords = Dict{Char, Vector{Tuple{Int,Int}}}()
            for i in 1:9, j in 1:9
                ch = pattern[i][j]
                if !haskey(label_coords, ch)
                    label_coords[ch] = Tuple{Int,Int}[]
                end
                push!(label_coords[ch], (i,j))
            end
            for (ch, coords) in label_coords
                if length(coords) != 3; continue; end
                # Check if tile is horizontal or vertical
                is_horiz = coords[1][1] == coords[2][1] == coords[3][1]
                is_vert = coords[1][2] == coords[2][2] == coords[3][2]
                if !(is_horiz || is_vert)
                    return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="Invalid tile shape for $ch")))
                end
                # Get the three cell values
                vals_tile = [vals[i,j] for (i,j) in coords]
                if any(x->x===nothing, vals_tile)
                    continue # skip incomplete tiles
                end
                # Find middle cell index
                mid_idx = 2
                if is_horiz
                    coords_sorted = sort(coords, by=x->x[2])
                else
                    coords_sorted = sort(coords, by=x->x[1])
                end
                v1, v2, v3 = [vals[i,j] for (i,j) in coords_sorted]
                # Middle must be largest
                if !(v2 > v1 && v2 > v3)
                    return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="Middle cell of each tile must be largest")))
                end
                # Ends must be different
                if v1 == v3
                    return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write((ok=false, msg="Ends of each tile must be different")))
                end
            end
            # If all checks pass, compute sum and check completeness
            s = sum(x isa Int ? x : 0 for x in vals)
            incomplete = any(x -> x === nothing, vals)
            if incomplete
                resp = (; ok=true, sum=s, msg="Valid, but incomplete. Current score: $s")
            else
                resp = (; ok=true, sum=s, msg="Valid solution! Score: $s")
            end
            return HTTP.Response(200, ["Content-Type" => "application/json"], JSON3.write(resp))
        else
            return HTTP.Response(404, "Not Found")
        end
    else
        return HTTP.Response(405, "Method Not Allowed")
    end
end

# function main(; host="127.0.0.1", port::Int=8080) # 127 is localhost only
function main(; host="0.0.0.0", port::Int=8080)
    # Seed RNG with fixed value for testing
    # Random.seed!(1234) # debug
    Random.seed!(RandomDevice())
    INDEX_HTML[] = load_index()
    println("Serving on http://" * host * ":" * string(port))
    HTTP.serve(handler, host, port; verbose=false)
end

if abspath(PROGRAM_FILE) == @__FILE__
    main()
end

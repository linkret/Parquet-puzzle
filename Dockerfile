FROM julia:1.11.7

WORKDIR /app
COPY . .

# Print Julia version for verification
RUN julia --version

# Install required Julia packages individually, preserving direct dependencies
RUN julia -e 'using Pkg; Pkg.add("HTTP", preserve=PRESERVE_DIRECT);'
RUN julia -e 'using Pkg; Pkg.add("Sockets", preserve=PRESERVE_DIRECT);'
RUN julia -e 'using Pkg; Pkg.add("JSON3", preserve=PRESERVE_DIRECT);'
RUN julia -e 'using Pkg; Pkg.add("Random", preserve=PRESERVE_DIRECT);'
RUN julia -e 'using Pkg; Pkg.add("JuMP", preserve=PRESERVE_DIRECT);'
RUN julia -e 'using Pkg; Pkg.add("HiGHS", preserve=PRESERVE_DIRECT);'

# If you have a Project.toml/Manifest.toml, this will install exact versions
RUN julia -e 'using Pkg; Pkg.instantiate();'

EXPOSE 8080

CMD ["sh", "-c", "while true; do julia server.jl; sleep 2; done"]
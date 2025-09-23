FROM julia:1.11.7

# Set up workdir
WORKDIR /app

# Copy your project files
COPY . .

# Install required Julia packages
RUN julia -e "using Pkg; Pkg.add.(['HTTP', 'Sockets', 'JSON3', 'Random', 'JuMP', 'HiGHS'])"

# Expose the port your server listens on (default 8080)
EXPOSE 8080

# Restart script if it crashes
CMD while true; do julia server.jl; sleep 2; done
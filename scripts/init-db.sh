
#!/bin/bash

# Reset PostgreSQL if needed
pg_ctl -D ~/.pg status || (rm -f ~/.pg/postmaster.pid && pg_ctl -D ~/.pg start -o "-c unix_socket_directories=/run/postgresql")

# Create database if it doesn't exist
psql -h /run/postgresql -c "SELECT 1 FROM pg_database WHERE datname = 'mydb'" | grep -q 1 || psql -h /run/postgresql -c "CREATE DATABASE mydb"

# Push schema changes
npx drizzle-kit push

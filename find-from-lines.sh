for d in *; do find $d -type f | xargs grep "^From:"; done

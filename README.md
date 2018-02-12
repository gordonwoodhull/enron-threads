# Enron Threads

Attempt to extract threads of email senders from [the CMU Enron Email Dataset](https://www.cs.cmu.edu/~enron/).

`find-from-lines.sh` - for each user folder in `./*`, grep for lines beginning with `From:` in all files.
`generate-threads.pl` - taking the output of the first process, generate JSON array of objects where `thread` is the name of the file, and `senders` is an array of email addresses (or whatever text was found if no good email address)

Could do smarter things like try to lookup email addresses for names, since many times just the name is printed.

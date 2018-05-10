# Enron Threads

Attempt to extract threads of email senders from [the CMU Enron Email Dataset](https://www.cs.cmu.edu/~enron/).

### Methodology

The Enron corpus consists of files containing single email threads, organized in mailboxes by user. We want to find chains of senders, essentially the `From:` lines of the messages.

(`To:` lines are interesting, too, but they branch a lot more and they are even messier. One of the next steps is to collect the final recipient in the threads, if the initial experiment is successful.)

1. Look for all email addresses in a all files, using Perl's `Email::Address` module.
2. Canonicalize the names found with the email addresses - usually this is just the first part of the email address, and that seems to be good enough for internal Enron email addresses. But `Email::Address` sometimes finds a name when the address is of the form `First Last <email@example.com` and that could be helpful.
3. Sort & uniq these names and addresses to build a map
4. Each file is an email thread. Extract the senders (see below for details), use the email address if present. If not, canonocalize the name and look it up in the address map.
5. Produce JSON array of threads for each user. Each thread consists of a filename and an array of "hops". Each hop is a sender email address, a line number in the file, and the `To:` line (for debugging only).

### Extracting the senders
Since this is just text, and apparently many different email clients were used, the formatting of the headers is all over the place. We can't rely on having `From:` lines.

The most reliable marker seems to be the `To:` field. If we saw a `From:` line before the `To:` line (but after the last `To:` line), that's great let's use that.

In many cases, however, just the name (and sometimes a timestamp) is present. There might be any kind of whitespace, even line breaks within names. We use heuristics to deal with each format. `generate-threads.pl` has a "failure mode" `-f` where it prints only the `From:` lines it did not recover.

### Scripts
 * `process-all-mailboxes.sh` - given a path and a prefix and a command, forks for each subdirectory of the path, reads all files `*/*`.  Prints them all to a single stream with a separator (in `process-file.sh`) that is unlikely to be in any of the sources. Pipes them through the command to a file with the prefix and name of the current subdirectory (username).
 * `extract-emails.pl` - read stdin, prints all emails found by `Email::Parse`, in tab-delimited name/address format. Names are canonicalized using a function in `CanonicalName.pm`. There are a lot of false positives; among other things, Enron seemed to have another email address syntax. Removing addresses without a dot in the second part seems to filter most of these.
 * `generate-threads.pl` - reads stdin, generates JSON array of objects `{file, hops: [{from, to, line}]}`


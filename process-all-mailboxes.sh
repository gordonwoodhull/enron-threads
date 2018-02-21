SDIR=`echo $0 | sed "s:/[^/]*$::"`
for d in `ls -1d $1/* | gshuf`; do find $d -type f | (while read f; do $SDIR/process-file.sh $f; done); done

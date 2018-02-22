SDIR=`echo $0 | sed "s:/[^/]*$::"`
DIR=$1
CMD=$2
PREFIX=$3
COUNT=0
for d in `ls -1d $DIR/* | gshuf # -n 1`; do
    NAME=`echo $d | sed "s:$1/::"`
    (TIME=`time (find -L $d -type f | (while read f; do $SDIR/process-file.sh $f; done) | $CMD > $PREFIX-$NAME.txt)`; echo $COUNT $NAME; echo $TIME) &
    ((COUNT++))
done


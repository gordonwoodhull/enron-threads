SHUF=gshuf
LIST=star
while [ "$1" != "" ]; do
    case $1 in
        -1) SHUF="$SHUF -n 1" ;;
        -n) LIST=$2; shift ;;
        --help) cat <<EOF

 Usage: $0 [--1] dir command prefix

 Run a command in parallel on all files found within some subdirectories

 'dir' is the path to look for subdirectories. fork this script in each subdirectory, then
 'command' is the script to run on each file
 'prefix' is the start of the output filename, $PREFIX-$NAME.txt

 -1 only one random subdirectory
 -n name choose only the named subdirectory

EOF
        exit 0 ;;
        *) break 2 ;;
    esac
    shift
done

SDIR=`echo $0 | sed "s:/[^/]*$::"`
DIR=$1
CMD=$2
PREFIX=$3
COUNT=0
case $LIST in
    star) LIST="ls -1d $DIR/*" ;;
    *) LIST="echo $DIR/$LIST" ;;
esac
echo "$LIST | $SHUF"
for d in `$LIST | $SHUF`; do
    echo Starting $COUNT $d..
    NAME=`echo $d | sed "s:$1/::"`
    (TIME=`(time (find -L $d -type f | (while read f; do $SDIR/process-file.sh $f; done) | $CMD > $PREFIX-$NAME.txt)) 2>&1`; echo Finished $COUNT $NAME; echo $TIME) &
    ((COUNT++))
done


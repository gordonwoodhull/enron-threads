set -e
SHUF=gshuf
LIST=star
SLOW=0

function usage {
 cat <<EOF

 Usage: $0 [-1] [-n name] [-slow N] dir prefix ext command...

 Run a command in parallel on all files found within some subdirectories

 'dir' is the path to look for subdirectories. fork this script in each subdirectory, then
 'prefix' is the start of the output filename, \$PREFIX-\$NAME.\$EXT
 'ext' is the filename extension
 'command...' is the script with arguments to pipe the files through

 -1		only one random subdirectory
 -n name	choose only the named subdirectory
 -slow N	pause N seconds after spawning each task (to conserve resources)

EOF
}
while [ "$1" != "" ]; do
    case $1 in
        -1) SHUF="$SHUF -n 1" ;;
        -n) LIST=$2; shift ;;
        -slow) SLOW=$2; shift ;;
        --help) usage; exit 0 ;;
        *) break 2 ;;
    esac
    shift
done

if [ $# -lt 4 ]; then usage; fi;

SDIR=`echo $0 | sed "s:/[^/]*$::"`
DIR=`echo $1 | sed "s:/$::"`
PREFIX=`echo $2 | sed "s:-$::"`
EXT=$3
shift;shift;shift;
CMD=$*

COUNT=0
case $LIST in
    star) LIST="ls -1d $DIR/*" ;;
    *) LIST="echo $DIR/$LIST" ;;
esac
echo "input directory: $DIR"
echo "output prefix: $PREFIX"
echo "list command: $LIST | $SHUF"
echo "process command: $CMD"
for d in `$LIST | $SHUF`; do
    sleep $SLOW
    NAME=`echo $d | sed "s:$DIR/::"`
    ONAME="$PREFIX-$NAME.$EXT"
    echo "Starting job #$COUNT $ONAME ..."
    (TIME=`(time (find -L $d -type f | (while read f; do $SDIR/process-file.sh $f; done) | $CMD > $ONAME)) 2>&1`; echo "Finished job #$COUNT $ONAME"; echo $TIME) &
    ((COUNT++))
done


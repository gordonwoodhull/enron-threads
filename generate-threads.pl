#!/usr/bin/perl
use warnings;
use strict;
use Getopt::Std;
use Email::Address;


my %options=();
getopts("fh:", \%options);

# print "[\n";

my @senders = ();
my $SHOWTHREADS = !defined $options{f};
my $MINHOPS = $options{h} || 3;

my @last = (), my @hops = (), my @failures = ();
my $conv, my $from;
my $failed = 0, my $found = 0;
while (my $line = <>) {
    if ($line =~ /^FFFFIIIILLLLEEEE/) {
        if ($SHOWTHREADS && @hops > $MINHOPS) {
            print "\nTHREAD ", scalar @hops, " HOPS ", $conv, "\n";
            print @{$_}, "\n" for @hops;
        }
        if (@failures) {
            print "\nTHREAD ", scalar @failures, " FAILURES ", $conv, "\n";
            print @{$_}, "\n" for @failures;
        }
        @hops = ();
        $conv = (split ' ', $line)[1];
        next;
    }
    if ($line =~ /(?<!-)From:/) {
        ($from = $line) =~ s/.*From: (.*)/$1/;
    } elsif ($line =~ /(?<!-)Forwarded by/) {
        ($from = $line) =~ s/.*Forwarded by (.*)/$1/;
    }
    if ($line =~ /(?<!-)To:/) {
        if (!$from) {
            if ($last[-1] =~ /^\s*[0-9\/]+/) {
                $from = $last[-2] =~ s/^\s*//;
            } else {
                for my $cand (@last) {
                    my @emails = Email::Address->parse($cand);
                    if (@emails) {
                        $from = $emails[0] . "\n";
                        last;
                    }
                }
            }
        }
        if ($from) {
            ++$found;
            push @hops, ["FROM " . $from, $line];
        }
        else {
            ++$failed;
            push @hops, [
                "FROM (unknown)\n",
                $line
                ];
            push @failures, [
                "need to find FROM\n",
                @last,
                $line
                ];
        }

        $from = '';
    };
    # my $src = $parts[0];
    # my $sender = $parts[1];
    # if ($src ne $last) {
    #     if($last && scalar @senders > 1) {
    #         print "{\n\t\"thread\": \"",$conv, "\",\n";
    #         print "\t\"senders\": [", join(', ', map {"\"$_\""} reverse @senders), "]\n";
    #         print "},\n";
    #     }
    #     @senders = ();
    # }
    # if($sender) {
    #     push @senders, sanitize($sender);
    # }
    push @last, $line;
    shift @last if @last > 5;
}

print "found ", $found, "\n";
print "failed " , $failed, "\n";

# print "]\n";

#!/usr/bin/perl
use warnings;
use strict;
use Email::Address;

# print "[\n";

my @senders = ();
my $MINHOPS = 3;

my @last = (), my @hops = ();
my $conv, my $from;
while (my $line = <>) {
    if ($line =~ /^FFFFIIIILLLLEEEE/) {
        if (@hops > $MINHOPS) {
            print "\nTHREAD ", $conv, "\n";
            for my $hop (@hops) {
                print @{$hop}, "\n"
            }
        }
        @hops = ();
        $conv = (split ' ', $line)[1];
        next;
    }
    if ($line =~ /(?<!X-)From:/) {
        ($from = $line) =~ s/.*From: (.*)/$1/;
    } elsif ($line =~ /(?<!X-)Forwarded by/) {
        ($from = $line) =~ s/.*Forwarded by (.*)/$1/;
    }
    if ($line =~ /(?<!X-)To:/) {
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
            push @hops, ["FROM " . $from, $line];
        }
        else {
            unshift @last, "need to find FROM\n";
            push @last, $line;
            push @hops, [@last];
            @last = ();
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

# print "]\n";

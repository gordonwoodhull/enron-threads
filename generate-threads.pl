#!/usr/bin/perl
use warnings;
use strict;
use Email::Address;

# print "[\n";

my @senders = ();
my $MINHOPS = 3;

# sub sanitize {
#     my ($from) = @_;
#     chomp $from;
#     $from = (split / on /, $from)[0];
#     my @emails = Email::Address->parse($from);
#     $from = $emails[0]->original if scalar @emails;
#     $from =~ s/^\s+|\s+$//g;
#     $from =~ s/["\t]//g;
#     $from =~ s/\\/\//g;
#     return $from
# }

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

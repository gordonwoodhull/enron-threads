#!/usr/bin/perl
use warnings;
use strict;
use Getopt::Std;
use Email::Address;
use JSON;


my %options=();
getopts("fh:", \%options);

# print "[\n";

sub print_object {
    my ($obj) = @_;
    my $json = to_json(\%$obj, {utf8 => 1, pretty => 1, canonical => 1});
    print $json, "\n";
}

my @senders = ();
my $SHOWTHREADS = !defined $options{f};
my $SHOWFAILURES = defined $options{f};
my $MINHOPS = $options{h} || 3;

my @last = (), my @hops = (), my @failures = ();
my $conv, my $from, my $fromname;
my $failed = 0, my $found = 0, my $lineno = 0;
while (my $line = <>) {
    ++$lineno;
    if ($line =~ /^FFFFIIIILLLLEEEE/) {
        if ($SHOWTHREADS && @hops > $MINHOPS) {
            print_object {
                "file"=> $conv,
                    "hops"=> \@hops
            }
        }
        if ($SHOWFAILURES && @failures) {
            print "\nTHREAD ", scalar @failures, " FAILURES ", $conv, "\n";
            print @{$_}, "\n" for @failures;
        }
        @hops = ();
        @failures = ();
        $conv = (split ' ', $line)[1];
        $lineno = 0;
        next;
    }
    if ($line =~ /(?<!-)From:/) {
        ($from = $line) =~ s/.*From: (.*)/$1/;
    } elsif ($line =~ /(?<!-)Forwarded by/) {
        ($from = $line) =~ s/.*Forwarded by (.*)/$1/;
    }
    if ($line =~ /(?<!-)To:/) {
        if (!$from) {
            my @flast = grep(!/^\s+$/, @last);
            if (@flast == 1) {
                ($fromname = $flast[0]) =~ s/^\s*//;
            }
            elsif (@flast > 1 && $flast[-1] =~ /^\s*[0-9]+\/[0-9]+\/[0-9]+/) {
                ($fromname = $flast[-2]) =~ s/^\s*//;
            } else {
                for my $cand (@flast) {
                    my @emails = Email::Address->parse($cand);
                    if (@emails) {
                        $from = $emails[0] . "\n";
                        last;
                    }
                }
            }
        }
        $line =~ s/^.*To:\s*//;
        $line =~ s/\s*$//;
        if ($from) {
            ++$found;
            push @hops, {
                "from-address"=> $from,
                    "to"=> $line,
                    "line"=> $lineno
            };
        }
        elsif ($fromname) {
            ++$found;
            push @hops, {
                "from-name"=> $fromname,
                    "to"=> $line,
                    "line"=> $lineno
            };
        }
        else {
            ++$failed;
            push @hops, {
                "from-address"=> undef,
                    "to"=> $line,
                    "line"=> $lineno
            };
            push @failures, [
                "need to find FROM\n",
                @last,
                $line
                ];
        }

        $fromname = $from = '';
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

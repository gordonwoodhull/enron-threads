#!/usr/bin/perl
use warnings;
use strict;
use Getopt::Std;
use Email::Address;
use JSON;

use FindBin;
use lib $FindBin::Bin;

use CanonicalName;

my %options=();
getopts("fh:a:", \%options);

sub print_object {
    my ($obj) = @_;
    my $json = to_json(\%$obj, {utf8 => 1, pretty => 1, canonical => 1});
    print $json;
}

my @senders = ();
my $SHOWTHREADS = !defined $options{f};
my $SHOWFAILURES = defined $options{f};
my $MINHOPS = $options{h} || 3;

my %addresses = ();

if ($options{a}) {
    open(ADDR, '<', $options{a}) or die "couldn't open addresses file " . $options{a};
    while (<ADDR>) {
        chomp;
        my ($name, $addr) = split /\t/;
        $addresses{$name} = $addr;
    }
}

# i know regexp for emails is technically much more complicated
# but the ones in this corpus tend to be pretty regular
sub valid_email {
    my ($email) = @_;
    return $email =~ m/^[A-Za-z_\.0-9-]+@[A-Za-z_-]+\.[A-Za-z_\.]+$/;
}

print "[\n" if $SHOWTHREADS;

my @last = (), my @hops = (), my @failures = ();
my $conv, my $from, my $fromname;
my $failed = 0, my $found = 0, my $lineno = 0, my $first = 1;
while (my $line = <>) {
    ++$lineno;
    if ($line =~ /^FFFFIIIILLLLEEEE/) {
        if ($SHOWTHREADS && @hops > $MINHOPS) {
            print ",\n" if !$first;
            $first = 0;
            print_object {
                file=> $conv,
                hops=> \@hops,
                skipped=> scalar @failures
            }
        }
        if ($SHOWFAILURES && @failures) {
            print_object {
                file=> $conv,
                failures=> \@failures
            };
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
                ($from = $flast[0]) =~ s/^\s*//;
            }
            elsif (@flast > 1 && $flast[-1] =~ /^\s*[0-9]+\/[0-9]+\/[0-9]+/) {
                ($from = $flast[-2]) =~ s/^\s*//;
            } else {
                for my $cand (@flast) {
                    my @emails = Email::Address->parse($cand);
                    if (@emails) {
                        $from = $emails[0]->address;
                        last;
                    }
                }
            }
        }
        $line =~ s/^.*To:\s*//;
        $line =~ s/\s*$//;
        my $rawfrom = $from, my $canonical = '', my $source = '';
        if ($from) {
            $from =~ s/^\s*//;
            $from =~ s/\s*$//;
            $source = 'valid';
            if (!valid_email($from)) {
                $from =~ s/ on .*$//;
                my @emails = Email::Address->parse($from);
                # Email::Address will accept emails without dots in the domain, corpus has lots of bogus addresses like that
                if (@emails && valid_email($emails[0]->address)) {
                    $from = $emails[0]->address;
                    $source = 'email';
                } else {
                    # take only "name characters"
                    (my $fromname) = $from =~ m/(^[A-Za-z, -"']+)/;
                    if($fromname) {
                        $fromname =~ s/ +$//;
                        $from = $fromname;
                        $canonical = canonical($from);
                        $from = $addresses{$canonical};
                        if (!$from) {
                            $canonical = shortened($canonical);
                            $from = $addresses{$canonical};
                        }
                        $source = 'lookup';
                    }
                    else {
                        $from = undef;
                    }
                }
            }
        }
        if ($from) {
            ++$found;
            push @hops, {
                rawfrom=> $rawfrom,
                from=> lc $from,
                to=> $line,
                line=> $lineno,
                source=> $source
            };
        }
        else {
            ++$failed;
            push @failures, {
                canonical=> $canonical,
                recent=> \@last,
                raw=> $rawfrom,
                to=> $line
            };
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
print "]\n" if $SHOWTHREADS;
if ($SHOWFAILURES) {
    print "found ", $found, "\n";
    print "failed " , $failed, "\n";
}


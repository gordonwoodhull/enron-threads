#!/usr/bin/perl
use warnings;
use strict;
use Email::Address;

my $last = '';
print "[\n";

my @senders = ();

sub sanitize {
    my ($from) = @_;
    chomp $from;
    $from = (split / on /, $from)[0];
    my @emails = Email::Address->parse($from);
    $from = $emails[0]->original if scalar @emails;
    $from =~ s/^\s+|\s+$//g;
    return $from
}

while (my $line = <>) {
    my @parts = split /:From:/, $line;
    my $src = $parts[0];
    my $sender = $parts[1];
    if ($src ne $last) {
        if($last && scalar @senders > 1) {
            print "{\n\t\"thread\": \"",$last, "\",\n";
            print "\t\"senders\": [", join(', ', map {"\"$_\""} reverse @senders), "],\n";
            print "},\n";
        }
        @senders = ();
    }
    if($sender) {
        push @senders, sanitize($sender);
    }
    $last = $src;
}

print "]\n";

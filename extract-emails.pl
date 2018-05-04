#!/usr/bin/perl
use warnings;
use strict;
use Email::Address;

while (my $line = <>) {
    my @emails = Email::Address->parse($line);
    if (@emails) {
        for my $addr (@emails) {
            my $orig = $addr->original;
            $orig =~ s/\r\n\z//g;
            if ($addr->address !~ m/@[^.]*$/) {
                (my $name = $addr->name) =~ s/^['"]*//; $name =~ s/['"]*$//;
                (my $address = $addr->address) =~ s/^['"]*//; $address =~ s/['"]*$//;
                print $name, "\t", $address, "\n"
            }
        }
    }
}


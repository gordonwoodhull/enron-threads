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
            print $addr->name, "\t", $addr->address, "\n" if $addr->address !~ m/@[A-Za-z_=?]*$/;
        }
    }
}


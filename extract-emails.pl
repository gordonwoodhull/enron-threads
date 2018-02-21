#!/usr/bin/perl
use warnings;
use strict;
use Email::Address;

while (my $line = <>) {
    my @emails = Email::Address->parse($line);
    if (@emails) {
        print $_, "\n" for @emails;
    }
}


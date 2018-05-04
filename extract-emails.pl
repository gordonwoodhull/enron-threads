#!/usr/bin/perl
use warnings;
use strict;
use Email::Address;

use FindBin;
use lib $FindBin::Bin;

use CanonicalName;

while (my $line = <>) {
    my @emails = Email::Address->parse($line);
    if (@emails) {
        for my $addr (@emails) {
            my $orig = $addr->original;
            $orig =~ s/\r\n\z//g;
            if ($addr->address !~ m/@[^.]*$/) {
                my $name = canonical($addr->name);
                # lowercase, remove begin/end quotes from emails
                (my $address = lc $addr->address) =~ s/^['"]*//; $address =~ s/['"]*$//;
                print $name, "\t", $address, "\n"
            }
        }
    }
}


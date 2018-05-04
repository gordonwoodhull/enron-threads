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
                # canonical version of name: first lowercase
                my $name = lc $addr->name;
                # remove begin/end quotes from names
                $name =~ s/^['"]*//;
                $name =~ s/['"]*$//;
                # convert dots to spaces
                $name =~ s/\./ /g;
                # sometimes emails slip through - drop @ part
                $name =~ s/@.*$//;
                # last, first => first last
                $name = join(' ', reverse split(/, */, $name)) if $name =~ m/,/;
                # just remove begin/end quotes from emails
                (my $address = $addr->address) =~ s/^['"]*//; $address =~ s/['"]*$//;
                print $name, "\t", $address, "\n"
            }
        }
    }
}


package CanonicalName;
use strict;
use warnings;
use Exporter;

our @ISA= qw( Exporter );

our @EXPORT = qw( canonical shortened );
sub canonical {
    # canonical version of name: first lowercase
    my ($name) = @_;
    $name = lc $name;
    # remove begin/end quotes from names
    $name =~ s/^['"]*//;
    $name =~ s/['"]*$//;
    # convert dots and underscores to spaces
    $name =~ s/[\._]/ /g;
    # sometimes emails slip through - drop @ part
    $name =~ s/@.*$//;
    # last, first => first last
    $name = join(' ', reverse split(/, */, $name)) if $name =~ m/,/;
    # extra spaces
    $name =~ s/  +/ /g;
    return $name
}

sub shortened {
    my ($name) = @_;
    my @parts = split(/ /, $name);
    return join(' ', $parts[0], $parts[-1]) if @parts > 2;
    return $name;
}

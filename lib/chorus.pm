package chorus;

use 5.10.0;

use Dancer ':syntax';
#use Dancer::Plugin::WebSocket;

use Text::Markdown qw/ markdown /;
use File::Slurp qw/ slurp /;

our $VERSION = '0.1';

my $prez;

get '/' => sub {
    template 'index' => { 
        presentation => $prez,
        prez_url => request->base,
        base_url => request->base->opaque,
    };
};

sub load_presentation {
    $prez = "<div class='slide'>". markdown( scalar slurp shift ) . "</div>";
    my $heads;
    $prez =~ s#(?=<h1>)# $heads++ ? "</div><div class='slide'>" : "" #eg;
}

true;

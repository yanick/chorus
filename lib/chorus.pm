package chorus;

use 5.10.0;

use Dancer ':syntax';
#use Dancer::Plugin::WebSocket;

use Text::Markdown qw/ markdown /;
use File::Slurp qw/ slurp /;

our $VERSION = '0.1';

get '/' => sub {
    template 'index' => { 
        presentation => presentation(),
        prez_url => request->base,
        base_url => request->base->opaque,
        aria => params->{aria},
    };
};

sub presentation {
    state $presentation;

    if ( not($presentation) or config->{reload_presentation} ) {
        $presentation = load_presentation();
    }

    return $presentation;
}

sub load_presentation {
    my $prez = "<div class='slide'>". markdown( scalar slurp config->{presentation} ) . "</div>";
    my $heads;
    $prez =~ s#(?=<h1>)# $heads++ ? "</div><div class='slide'>" : "" #eg;
    return $prez;
}

true;

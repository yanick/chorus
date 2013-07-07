package App::Chorus;
# ABSTRACT: Markdown-based slidedeck server app

use 5.10.0;

use Dancer ':syntax';
use Dancer::Plugin::WebSocket;

use Text::Markdown qw/ markdown /;
use HTML::Entities qw/ encode_entities /;
use File::Slurp qw/ slurp /;

our $presentation_file;

our $choirmaster = JSON::true;

get '/' => sub {
    template 'index' => { 
        presentation => presentation(),
        prez_url => request->base,
        base_url => request->base->opaque,
        aria => params->{aria},
    };
};

get '/choirmaster' => sub {
    my $data = { choirmaster => $choirmaster };

    # first come grabs the pawah
    $choirmaster = JSON::false;

    return $data;
};

ws_on_new_listener sub {
    debug "why, hello there";
    ws_send '{"master":"plan"}';
};

sub presentation {
    state $presentation;

    if ( not($presentation) or config->{reload_presentation} ) {
        $presentation = load_presentation();
    }

    return $presentation;
}

sub load_presentation {
    $presentation_file ||= config->{presentation};
    
    my $markdown = groom_markdown( scalar slurp $presentation_file );

    my $prez = "<div class='slide'>". markdown( $markdown ) . "</div>";
    my $heads;
    $prez =~ s#(?=<h1>)# $heads++ ? "</div><div class='slide'>" : "" #eg;
    return $prez;
}

sub groom_markdown {
    my $md = shift;

    $md =~ s#^(~~~+)\s*?(\S*)$ (.*?)^\1$ #
        "<pre class='snippet sh-$2'>" 
      . encode_entities($3) 
      . '</pre>'#xemgs;

    return $md;
}

true;

package App::Chorus;
# ABSTRACT: Markdown-based slidedeck server app

use 5.10.0;

use Dancer ':syntax';

use Dancer::Plugin::WebSocket;
use Dancer::Plugin::Cache::CHI;

use Text::Markdown qw/ markdown /;
use HTML::Entities qw/ encode_entities /;
use File::Slurp qw/ slurp /;

our $presentation_file;

cache_set choirmaster => JSON::true;
cache_set current_slide => 0;

get '/' => sub {
    template 'index' => { 
        presentation => presentation(),
        prez_url => request->base,
        base_url => request->base->opaque,
        aria => params->{aria},
    };
};

get '/choirmaster' => sub {
    my $data = { choirmaster => cache_get 'choirmaster' };

    if( cache_get 'choirmaster' ) {
        cache_set started_at => time;
    }

    # first come grabs the pawah
    cache_set choirmaster => JSON::false;

    return $data;
};

get '/status' => sub {
    return {
        current_slide => cache_get( 'current_slide' ),
        started_at => cache_get( 'started_at' ),
    };
};

ws_on_message sub {
    my $data = shift;

    if( defined $data->{slide} ) {
        cache_set current_slide => $data->{slide};
    }

    # passthrough
    return $data;
};

sub presentation {
    state $presentation;

    if ( not($presentation) or config->{reload_presentation} ) {
        $presentation = load_presentation();
    }

    return $presentation;
}

sub load_presentation {
    $presentation_file ||= setting 'presentation';
    
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

__END__

=HEAD1 DESCRIPTION

L<Dancer> application module for C<chorus>. See C<chorus>'s manpage for
details on how to use it.

    

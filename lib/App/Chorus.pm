package App::Chorus;
# ABSTRACT: Markdown-based slidedeck server app

use 5.10.0;

use Dancer ':syntax';

use Dancer::Plugin::WebSocket;
use Dancer::Plugin::Cache::CHI;

use Text::Markdown qw/ markdown /;
use HTML::Entities qw/ encode_entities /;
use Path::Tiny;

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

get '/**' => sub {
    my $path = join '/', @{ (splat)[0] };

    pass unless $App::Chorus::local_public;

    $path = join '/', $App::Chorus::local_public, $path;

    pass unless -f $path;

    send_file $path, system_path => 1;
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
    
    my $markdown = groom_markdown( path($presentation_file)->slurp );

    my $prez = markdown( $markdown );

    use Web::Query;
    my $q = Web::Query->new_from_html( "<body>$prez</body>" );

    # move stuff in sections
    my $qs = Web::Query->new_from_html( "<div class='slides'></div>" );
    my $section;

    $q->contents->each(sub{
            my( $i, $elem ) = @_;

            if ( $elem->get(0)->tag =~ /^h[12]$/ ) {
                $qs->append( "<section />" );
            }

            $elem->detach;
            $qs->find('section')->last->append($elem);
    });

    my $prev_section;
    $qs->find('section')->each(sub{
        my( $i, $elem ) = @_;

        my $head = $elem->find('h1,h2')->first or return;

        my $text = $head->text;

        if ( $text =~ s/cont'd//i ) {
                $DB::single = 1;
                
            if ( $prev_section->find('section')->size == 0 ) {
                my $s = wq("<section />");
                for ( $prev_section->contents ) {
                    $_->detach;
                    $s->append($_);
                }
                $prev_section->append($s);
            }
                
            $head->text($text);
            $elem->detach;
            $prev_section->append($elem);
        }
        else {
            $prev_section = $elem;
        }

    });


    $qs->find('li')->each(sub{
            my(undef,$elem)=@_;

            if ( $elem->text =~ /^\s*\.{3}/ ) {
                (my $text = $elem->text ) =~ s/^\s*\.{3}//;
                $elem->text($text);
                $elem->add_class('fragment');
            }

    });

    return $qs->as_html;
}

sub groom_markdown {
    my $md = shift;

    $md =~ s#^(```+)\s*?(\S*)$ (.*?)^\1$ #
        "<pre><code class='$2'>" 
      . encode_entities($3) 
      . '</code></pre>'#xemgs;

    return $md;
}

load_presentation();

true;

__END__

=HEAD1 DESCRIPTION

L<Dancer> application module for C<chorus>. See C<chorus>'s manpage for
details on how to use it.

    

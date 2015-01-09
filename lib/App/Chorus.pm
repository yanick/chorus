package App::Chorus;
# ABSTRACT: Markdown-based slidedeck server app

use 5.10.0;

use Dancer ':syntax';

use App::Chorus::Slidedeck;

get '/' => sub {
    template 'index' => {
        presentation => presentation()->html_body,
        title => presentation()->title,
        author => presentation()->author,
        theme => presentation()->theme,
    };
};

get '/**' => sub {
    my $path = join '/', @{ (splat)[0] };

    pass unless $App::Chorus::local_public;

    $path = join '/', $App::Chorus::local_public, $path;

    pass unless -f $path;

    send_file $path, system_path => 1;
};

sub presentation {
    state $presentation;

    if ( not($presentation) or config->{reload_presentation} ) {
        $presentation = App::Chorus::Slidedeck->new(
            src_file => setting 'presentation'
        );
    }
}

1;

__END__

=HEAD1 DESCRIPTION

L<Dancer> application module for C<chorus>. See C<chorus>'s manpage for
details on how to use it.




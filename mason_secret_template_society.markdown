# Mason: Secret Template Society

# Template Systems: Why?

~~~~~~~~~~~~~ perl

print "<html><head><title>", $title, "</title></head>";

my $dbh = DBI->connect( 'dbi:SQLite:database_name=foo.db' );

my $sth = $dbh->prepare( 'SELECT name FROM puppies WHERE owner = ?' );

$sth->execute( param('username') );

print "<body><h1>Your Puppies</h1><ul>";

while ( my( $pup ) = $sth->fetchrow ) {
    print "<li>$pup</li>"
}

print "</body></html>";

~~~~~~~~~~~~~

# That's why

# That's why (expanded)

Problems with logic and display mashed together

* Hard to read (saw the missing closing tags?)

* Dreams of code reuse are crushed

* Devs don't want to see html tag soups

* Web designers don't want to see logic voodoo

# So... Template Systems

Different needs, different template systems

* Text::Template

* Template::Toolkit 

* Mason

* Template::Declare

*and more...*

# Why Mason?

Extensive. 

Powerful. 

Use Perl, not a micro-language.

I like it.

# Mason History

## HTML::Mason

Came to be a long time ago, in the days of Apache 1.

Doesn't have to be used with Apache or mod_perl, but lots of anatomical details
reveal the potential symbiotic relationship with it.

# Mason History

## Mason

> Thanks to Tatsuhiko Miyagawa and the PSGI/Plack team, who freed me from ever worrying about server backends again.

Came recently.

Rewrite. Based on Moose. Some significant changes to the syntax.

# Interfaces w/ Modern Web Frameworks

* Dancer::Template::Mason and Dancer::Template::Mason2

* Catalyst::View::HTML::Mason

# Let's render some template

~~~ perl

use FindBin;
use Path::Class qw/ dir /;

use HTML::Mason::Interp;

my $interp = HTML::Mason::Interp->new(
    comp_root => ''.dir( $FindBin::Bin, 'root' )->absolute,
);

print $interp->exec( '/hello.mason', name => 'Georges' );

~~~

# Meet the template

~~~ perl

<html>
<body>
    <h1>Hi there, <% $name %>!</h1>
</body>
</html>
<%args>
$name
</%args>

~~~

# Passing arguments

~~~ perl

<%args>
$foo
$foo => 'default'
@bar
%baz => ( a => 1, b => 2 )
</%args>

~~~

# Also in %ARGS

~~~ perl

Hi there, <% $ARGS{name} %>!

~~~

# Also in @_

~~~ perl

The raw arguments are <% join " : ", @_ %>!

~~~

# Printing stuff

~~~ perl

The price of evil is <% sin(1) %>

~~~

# Escaping stuff

~~~ perl

% my $x = "</div>mouahaha";
% my $y = "this is all fun and game";

<div><% $x | h %></div>

<a href="/stuff/<% $y | u %>">stuff</a>

~~~

# Running Perl code

~~~ perl

% for my $i ( 1..100 ) {
    <li>2 to the power <% $i %> is <% 2**$i %></li>
% }

~~~

# Running Perl blocks

~~~ perl

<%perl>
    # big bad block o' Perl code

    $m->print( "Hi!" );
    # rather than print "Hi!";
</%perl>

~~~

# Components

~~~ perl

% for ( @puppies ) {
<h2><% $_->name %></h2>
<div>color: <% $_->color %></div>
% }

~~~

# Components

~~~ perl

% for ( @puppies ) {
    <& .puppy_profile, puppy => $_ &>
% }

~~~

# or even

~~~ perl

% $m->comp( '.puppy_profile', { puppy => $_ } ) for @puppies;

~~~

# and then...

~~~ perl

<%def .puppy_profile>
<%args>
$puppy
</%args>
    <h2><% $puppy->name %></h2>
    <div>color: <% $puppy->color %></div>
</%def>

~~~


# Doesn't need to be in the same file either

~~~ perl

<& /puppy/profile.mason, puppy => $pup &>

~~~


# Components can wrap stuff too

~~~ perl

<&| /fx/hk_frame.mason, atrocious => 1 &>
    Yadah yadah yadah...
</&>

~~~

# and in hk_frame.mason...

~~~ perl

<div style="color: pink; background: src('hello_kitty.png')">
% $m->print( '<blink') if $atrocious;
<% $m->content %>
% $m->print( '</blink') if $atrocious;
</div>

<%args>
$atrocious => 0
</%args>

~~~

# Autohandler

if `autohandler` exists in directory, request get runs through it first.

~~~ perl

<&| /webenv/generic.mason &>
% $m->call_next;
</&>

~~~

# <%once>

Run once when the component is first loaded

~~~ perl

<%once>
use Foo;
use Bar;
</%once>

~~~

# <%init>

Run before the main body of the component

~~~ perl

It is <% $time  %>, Dr. Wilfred.

<%init>
my $time = DateTime->now;
</%init>

~~~

# <%cleanup>

Flip-side of <%init>

# <%filter>

~~~ perl

<%filter>
s/wat\?/Your statemen bewilder me. Please reformulate./g;
</%filter>

~~~

# Mason 2


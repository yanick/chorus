#!/usr/bin/env perl

use strict;

use Dancer;

use lib path(dirname(__FILE__), 'lib');
load_app 'chorus';

use AnyMQ;
use Plack::Builder;

my $bus = AnyMQ->new;
my $topic = $bus->topic('demo');

my $token = 'master';
$chorus::first_connect = 1;

# Web::Hippie routes
get '/new_listener' => sub {
    request->env->{'hippie.listener'}->subscribe($topic);
};
get '/message' => sub {
    my $msg = request->env->{'hippie.message'};
    if ( $chorus::first_connect ) {
        $chorus::first_connect = 0;
        $topic->publish( { master => $token } );
    }
    else {
        $topic->publish( $msg );
    }
};

builder {
    mount '/' => dance;
    mount '/_hippie' => builder {
        enable '+Web::Hippie';
        enable '+Web::Hippie::Pipe', bus => $bus;
        dance;
    };
};

#!/usr/bin/perl 

use Dancer;
use AnyMQ;
use Plack::Builder;

my $bus = AnyMQ->new;
my $topic = $bus->topic('demo');

get '/' => sub { template 'index' };

# Web::Hippie routes
get '/new_listener' => sub {
    request->env->{'hippie.listener'}->subscribe($topic);
};
get '/message' => sub {
    my $msg = request->env->{'hippie.message'};
    $topic->publish($msg);
};

builder {
    mount '/' => dance;
    mount '/_hippie' => builder {
        enable '+Web::Hippie';
        enable '+Web::Hippie::Pipe', bus => $bus;
        dance;
    };
};

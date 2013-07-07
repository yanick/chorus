
use strict;
use warnings;

use Module::Build 0.3601;


my %module_build_args = (
  "build_requires" => {
    "Module::Build" => "0.3601",
    "Test::More" => "0.88"
  },
  "configure_requires" => {
    "Module::Build" => "0.3601"
  },
  "dist_abstract" => "Markdown-based slidedeck server app",
  "dist_author" => [
    "Yanick Champoux <yanick\@cpan.org>"
  ],
  "dist_name" => "App-Chorus",
  "dist_version" => "0.1.0",
  "license" => "perl",
  "module_name" => "App::Chorus",
  "recommends" => {},
  "recursive_test_files" => 1,
  "requires" => {
    "Dancer" => 0,
    "Dancer::Plugin::Cache::CHI" => 0,
    "Dancer::Plugin::WebSocket" => 0,
    "File::ShareDir::Tarball" => 0,
    "File::Slurp" => 0,
    "Getopt::Long" => 0,
    "HTML::Entities" => 0,
    "Path::Tiny" => 0,
    "Plack::Loader" => 0,
    "Text::Markdown" => 0,
    "perl" => "v5.10.0",
    "strict" => 0,
    "warnings" => 0
  },
  "script_files" => [
    "bin/chorus"
  ],
  "share_dir" => {
    "dist" => "share"
  }
);


my $build = Module::Build->new(%module_build_args);

$build->create_build_script;

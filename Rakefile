require 'json'
files = ['background','popup']

desc "Merge and minify JavaScript documents"
task :juicer do
  files.each do |file|
    puts `juicer merge -t js -i -f javascripts/#{file}.js;`
  end
end

namespace :juicer do
  desc "Merge JavaScript documents (debug)"
  task :debug do
    files.each do |file|
      puts `juicer merge --force -s -m none javascripts/#{file}.js;`
    end
  end
  
  desc "Verify JavaScript documents"  
  task :verify do 
    files.each do |file|
      puts `juicer verify javascripts/#{file}.js;`
    end
  end
end

desc "Build and ZIP"
task :build do
  manifest = JSON.parse(File.read('manifest.json'))
  
  puts "-"*50
  puts "Building #{manifest['name']}"
  puts "-"*50
  
  
  Rake::Task['juicer'].invoke
  
  system "rm -rf precompiled"
  system "mkdir precompiled"
  
  system "cp * precompiled/"
  system "cp -r css/ precompiled/css"
  system "cp -r images/ precompiled/images"
  system "cp -r javascripts/ precompiled/javascripts/"
  
  system "rm precompiled/*.png"
  system "rm precompiled/javascripts/*.js"
  system "cp javascripts/*.min.js precompiled/javascripts/"
  system "rm precompiled/Gemfile"
  system "rm precompiled/Gemfile.lock"
  system "rm precompiled/Rakefile"
  
  
  system "mkdir build"
  system "zip -r build/#{manifest['name']}_#{manifest['version']}.zip precompiled/"
  
  puts "-"*50
  puts "Completed build of #{manifest['name']}"
  puts "-"*50

end
begin
  require 'jasmine'
  load 'jasmine/tasks/jasmine.rake'
rescue LoadError
  task :jasmine do
    abort "Jasmine is not available. In order to run jasmine, you must: (sudo) gem install jasmine"
  end
end

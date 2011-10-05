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
  puts "Compiling JavaScript"
  Rake::Task['juicer'].invoke
  puts "Completed Javascript Compile"
  
  system "mkdir precompiled"
  
  system "cp * precompiled/*"
  
  system "rm precompiled/javascripts/background.js"
  system "rm precompiled/javascripts/popup.js"
  system "rm precompiled/javascripts/storage.js"
  system "rm precompiled/Gemfile"
  system "rm precompiled/Gemfile.lock"
  system "rm precompiled/Rakefile"
  
  manifest = File.read('manifest.json')
  
  system "mkdir builds"
  system "zip txtvia#{manifest.version}.zip precompiled/**"
end
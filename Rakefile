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
 module.exports = (grunt) ->

    grunt.initConfig
        concat: 
            vendor:
                src: ['components/jquery/jquery.min.js', 'components/angular/angular.js', 'components/angular-ui-select2/select2.js']
                dest: 'public/scripts/vendor.js'
            app: 
                src: ['public/scripts/app.js']
                dest: 'public/scripts/app-compiled.js'
            css:
                src: ['components/bootstrap/dist/css/bootstrap.min.css']
                dest: 'public/styles/vendor.css'

        ngtemplates: 
            dist:
                options:
                    base: 'public/templates'
                    module: 'boozefind'
                    concat: 'app'
                src: 'public/templates/**/*.html'
                dest : 'public/scripts/templates.js'

        watch: 
            scripts: 
                files: ['**/app.js', '**/*.tpl.html']
                tasks: ['default']
                options:
                    spawn: no

    grunt.loadNpmTasks 'grunt-contrib'

    grunt.loadNpmTasks 'grunt-angular-templates'

    grunt.registerTask 'default', ['ngtemplates:dist', 'concat:vendor', 'concat:app', 'concat:css']
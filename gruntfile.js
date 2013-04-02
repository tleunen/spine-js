module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    var spineFiles = [
        'src/spine.js',
        'src/xhr.js',
        'src/skeletonJson.js',
        'src/skeletonData.js',
        'src/attachmentLoader.js',
        'src/attachment.js',
        'src/animation.js',
        'src/skeleton.js',
        'src/bone.js',
        'src/slot.js',
        'src/skin.js',
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            dist: ['dist']
        },

        concat: {
            dist: {
                src: spineFiles,
                dest: 'dist/spine.js'
            },
            test: {
                src: spineFiles,
                dest: 'test/spine.js'
            }
        },

        jshint: {
            options: {
                sub: true
            },
            all: ['src/*.js']
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n',
                mangle: {toplevel: true},
                compress: false,
                preserveComments: 'some',
                wrap: '',
                exportAll: true
            },
            dist: {
                files: {
                'dist/spine.js': ['dist/spine.js']
                }
            }
        },

        watch: {
            scripts: {
                files: ['src/*.js'],
                tasks: ['test'],
                options: {
                    nospawn: true
                }
            }
        }

    });

    grunt.registerTask('test', 'jshint concat:test'.split(' '));
    grunt.registerTask('dist', 'clean jshint concat:dist uglify'.split(' '));

    grunt.registerTask('default', 'dist'.split(' '));
};
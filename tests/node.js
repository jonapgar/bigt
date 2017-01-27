var fs = require('fs')
var Promise = require('bluebird')
var readFile = Promise.promisify(require("fs").readFile);
require('chai').should()

describe('Testing translation library t in nodejs',function(){
	var t;
	it('Should initialize',function(){
		var T=require('./../bigt.js')
		t = new T();
		return t.init({
			lng:'en',
			languages:['en','fr'],
			storage:null,
			path:__dirname + '/data/{{lng}}/{{ns}}.json',
			namespaces:['default'],
			defaultNamespace:'default',
			fetch:function(path){
				return readFile(path,'utf8').then(function(data){
					return JSON.parse(data)
				})
			}
		})	
	})
	
	it('should load english',function(){
		return t.load('en').then(function(){
			var en = t.bind('en');
			var result = en('default:test',{param:'it works'});
			result.should.equal('yes it works');
			
		})	
	})
	
	
	it('should load french',function(){
		return t.load('fr').then(function(){
			var fr = t.bind('fr');
			var result = fr('default:test',{param:'it works'});
			result.should.equal('oui it works');
			
		})	
	})
})


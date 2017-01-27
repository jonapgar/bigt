(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(['lodash','bluebird'], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory(require('lodash'),require('bluebird'));
	} else {
		root.t = factory(root._,root.Promise);
	}
}(this, function(_,Promise) {
	

	

	var ls = {};
	ls.get = function getFromStorage(prefix, key) {
		var res;
		try {
			res = localStorage.getItem(prefix + key);
			if (!res)
				res = undefined;
			else {
				res = JSON.parse(res);

			}
		} catch (e) {

			o.error('could not get %s from local o.storage', key);
			res = undefined;
		}
		return res;
	}

	ls.set = function setStorage(prefix,key, data) {

		try {
			localStorage.setItem(prefix + key, _.isString(data) ? data : JSON.stringify(data));
		} catch (e) {
			o.error('could not set %s from local o.storage', key);
			o.error(e);

		} finally {
			return data;
		}
	}

	ls.remove = function setStorage(prefix,key) {

		try {
			localStorage.removeItem(prefix + key);
		} catch (e) {
			o.error('could not remove %s from local o.storage', key);
			o.error(e);

		} finally {
			return;
		}
	}

	

	var u = {};

	u.defaultRequest = {
		forceString: true,
		escapeInterpolation:false,
		defaultValue:undefined,
	};

	u.defaultOptions = {
		namespaceDelimiter:':',
		keyDelimiter:'.',
		error:console.error,
		prefix:'ttt_',
		noEscapePrefix:'HTML',
		replacer:/\{\{(.*?)\}\}/g,
		recursor:/\$t\((.*?)\)/g,
		entityRegex:/[&<>"'\/]/g,
		entityMap:{
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': '&quot;',
			"'": '&#39;',
			"/": '&#x2F;'
		},
		sanitizeOptions:function(o){
			o = o || {};
			return _.defaults({},o,{
				forceString:o.returnObjectTrees,
				escapeParameters:o.escapeInterpolation,
			})
		}
	}

	

	
	u.init = u.initialize = function init(options) {

		this.options = options = _.defaults(options || {}, this.defaultOptions);
		this.caches={};
		this.quickCache={};
		this.remoteHashes ={};
		this.languagePromises={};
		

		if (options.noEscapePrefix)
			options.noEscapePrefixRegex = options.noEscapePrefixRegex || new RegExp('^' + options.noEscapePrefix);

		if (options.storage=='localStorage') {
			options.storage = ls;
		}
		if (options.storage) {
			_.each(['get','set','remove'],function(k){
				options.storage[k] = _.partial(options.storage[k],options.prefix);
			})
		}

		var lng = options.lng;
		if (!_.includes(options.languages = options.languages || ['en'], lng)) {
			lng = 'en';
		}
		this.language = options.lng = lng;
		
		return this;
	}

	u.ready = function(){
		return this.reload(this.language);
	}
	u.fetch = function(){
		
		var fetch = this.options.fetch;
		return fetch.apply(this,arguments);
	}

	u.lng = u.getLng = u.getLanguage = function getLanguage() {
		return this.language;
	}

	u.getResourceBundle = u.getNamespace = function getNamespace(lng, ns) {

		return _.get(this.caches, [lng, ns]);
	}

	u.addResource = u.addNamespace = function addNamespace(lng, ns, k, v) {
		var o = this.options;
		_.set(this.caches, [lng, ns].concat(k.split(o.keyDelimiter)), v);
		return o.storage ? o.storage.set(lng + '_' + ns, _.get(this.caches, [lng, ns])):v;
	}

	u.bind = function(lng){
		return _.bind(this.translate,this,lng)
	}

	u.setLanguage = u.setLng = function(lng){
		return this.load(lng).then(function(data){
			this.language = this.options.lng = lng;
			this.t = this.bind(this.language);	
			return data;
		})
	}

	u.load = function load(lng) {

		lng = lng || this.language;
		
		var o = this.options,
			self = this;


		
		
		if (lng in this.languagePromises) {
			
			return this.languagePromises[lng];
		}


		

		if (!_.includes(o.languages, lng)) {
			
			return new Promise(function(resolve,reject){

				reject(new Error('You cant change the language to ' + lng + ', we dont have it'));
			})
		}





		if (!o.hashPath || !o.storage) {

			return this.reload(lng);
		}


		var params = {
			lng: lng,
			ns: 'hashes'
		};



		if (this.remoteHashes[lng]) {

			o.storage.set('localizationHash_' + lng, this.remoteHashes[lng]);
			this.reload(lng, cb);
		}
		

		var hashUrl = o.hashPath.replace(o.replacer, function(m, k) {
			return params[k];
		});

		return this.languagePromises[lng] = new Promise(function(resolve,reject){

			self.fetch(hashUrl).then(function(remoteHash){
				self.remoteHashes[lng] = remoteHash;
			


				var localHash = o.storage.get('localizationHash_' + lng) || {};
				if (!self.options.namespaces) {
					self.options.namespaces = Object.keys(remoteHash);
				}
				_.each(localHash, function(h, ns) {

					if (h !== remoteHash[ns]) {

						o.storage.remove(lng + '_' + ns);
					}

				})

				o.storage.set('localizationHash_' + lng, remoteHash);
				
				return self.reload(lng).then(resolve,reject);
			}).catch(function(err){
				o.error(err)
				o.error('error getting i18n from o.storage. flushing hash');
				self.localHash = {};
				o.storage.set('localizationHash_' + lng, '{}');
				reject(err);
			})
		});
	}

	u.reload = function reload(lng) {

		

		var o = this.options,
			self = this;

		

		var cache = this.caches[lng] = this.caches[lng] || {};


		

		var fetches = [];

		var promises = _.reduce(o.namespaces, function(memo, ns, index, allNs) {
			memo[ns] = new Promise(function(resolve,reject){
				

				var data = cache[ns] || (o.storage && o.storage.get(lng + '_' + ns));

				//if there is an __error in the data, we will try to reload it.
				if (data && !data.__error) {

					resolve(data);
					return memo;
				}
				
				var params = {
					lng: lng,
					ns: ns
				};

				var fetch;
				fetches.push(fetch = self.fetch(o.path.replace(o.replacer, function(m, k) {
						return params[k];
				})).then(function(data){
					delete data.__error;
					return o.storage ? o.storage.set(lng + '_' + ns, data):data;
				}).then(resolve).catch(function(){
					resolve({
						'__error': true
					})
				}));
			});
			return memo;
		}, {});

		var self = this;
		var promiseKeys = Object.keys(promises);

		return Promise.all(_.values(promises)).then(function(results){
		
			_.each(results, function(res, i) {

				cache[promiseKeys[i]] = res;
			});

			
			return cache;
		})
		

	}
	u.returnDefault = function returnDefault(options, k) {
		options = options || {};
		var defaultValue = options.defaultValue,
			v;
		if (defaultValue === undefined) {
			if (!options.forceString)
				v = {} //probably should be null
			else
				v = k;
		} else {
			v = _.isFunction(defaultValue) ? defaultValue.call(this, k) : defaultValue;
		}
		return (options.forceString) ? (v + '') : v;
	}

	u.translate = function translate(lng,k, options) {

		if (this.options.sanitizeOptions)
			options = this.options.sanitizeOptions(options);

		if (options && options.lng)
			lng = options.lng;
		
		if (!this.caches[lng]) {

			if (this.options.fallbackLanguage) {
				this.options.error(new Error('Called translate before language has loaded, using fallbackLanguage: ' + this.options.fallbackLanguage))
				this.caches[lng] = this.caches[this.options.fallbackLanguage]	
			} else {
				this.options.error(new Error('Called translate before language has loaded, returning default'));
				return this.returnDefault(options,k);
			}
			//will attempt to load the language requested for next usage. 
			this.reload(lng).catch(function(e){
				o.error(e)
			});
		}
		var originalOptions = _.clone(options);
		var o = options = _.defaults(options ? _.clone(options) : {}, this.defaultRequest, this.options)
		var esc = o.escapeInterpolation;
	
		if (!k)
			return this.returnDefault(options, k);

		

		
		var cache = this.caches[lng];
		var a = k.split(o.namespaceDelimiter);
		var defaultNamespace = this.options.defaultNamespace;

		var ns, namespace,key;
		
		

		if (a.length == 1)
			ns = defaultNamespace;
		else
			ns = a.shift();

		namespace = cache[ns];
		key = a[0].split(o.keyDelimiter);
		var v = _.get(namespace, key);

		if (v === undefined) {
			if (defaultNamespace && ns != defaultNamespace) {
				v = _.get(cache[defaultNamespace], key);
				if (v === undefined) {

					return this.returnDefault(options, k);
				}
			} else
				return this.returnDefault(options, k);
		}

		if (!_.isString(v)) {

			v = o.forceString ? (v + '') : v;
		}
		if (!_.isString(v))
			return v;

		var params = _.omit(originalOptions,Object.keys(this.defaultRequest))

		if (!_.isEmpty(params)) {
			v = v.replace(o.replacer, function(m, k) {

				if (!k) {

					return m
				}
				if (esc && o.noEscapePrefix && o.noEscapePrefixRegex.test(k)) {
					var noEscape = true;
					k = k.substring(0, k.length - o.noEscapePrefix.length);
				}
				var res = _.get(params, k);

				if (res === undefined) {

					res = m;
				}
				res += ''

				if (esc && !noEscape) {
					res = res.replace(o.entityRegex, function(s) {
						return o.entityMap[s];
					})
				}
				return res;
			});
		}
		var innerOptions = _.clone(originalOptions || {});
		//dont resupply defaultValue to inner queries 
		delete innerOptions.defaultValue;
		
		//force return string for inner queries
		innerOptions.forceString = true;


		var self = this;

		v = v.replace(o.recursor, function(m, k) {

			if (!k)
				return ''

			return self.translate(lng,k, innerOptions) + '';
		});



		return v;

	}
	
	var c = function() {
		
	};
	_.extend(c.prototype, u);
	return c;
}));

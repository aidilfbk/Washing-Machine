(function(window){
	/*
	 * jQuery throttle / debounce - v1.1 - 3/7/2010
	 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
	 * 
	 * Copyright (c) 2010 "Cowboy" Ben Alman
	 * Dual licensed under the MIT and GPL licenses.
	 * http://benalman.com/about/license/
	 */
	(function(b,c){var $=b.jQuery||b.Cowboy||(b.Cowboy={}),a;$.throttle=a=function(e,f,j,i){var h,d=0;if(typeof f!=="boolean"){i=j;j=f;f=c}function g(){var o=this,m=+new Date()-d,n=arguments;function l(){d=+new Date();j.apply(o,n)}function k(){h=c}if(i&&!h){l()}h&&clearTimeout(h);if(i===c&&m>e){l()}else{if(f!==true){h=setTimeout(i?k:l,i===c?e-m:e)}}}if($.guid){g.guid=j.guid=j.guid||$.guid++}return g};$.debounce=function(d,e,f){return f===c?a(d,e,false):a(d,f,e!==false)}})(this);
	
	var TUMBLR_IFRAME_LOADED = false,
		Debounce = (this['Cowboy'] || this['jQuery']).debounce,
		get_now_epoch = function(){
			return Math.floor((new Date()).getTime()/1000);
		}
	
	var post_like_status = {
		_staleTimeout: 60 * 60 * 24,
		_ajaxCallback: function(post_ids, callback){
			var now = get_now_epoch(),
				all_posts_ready = post_ids.every(function(post_id){
					return (
						(post_id in this._store) &&
						((now - this._store[post_id].last_updated) < this._staleTimeout)
					);
				}, this);
				if(all_posts_ready){
					var liked_posts = {};
					post_ids.forEach(function(post_id){
						liked_posts[post_id] = this._store[post_id].value
					}, this);
					callback.call(undefined, liked_posts);
				}
				return all_posts_ready;
		},
		_syncPersistentStore: function(){
			var persistent_store = localStorage.WM_LIKE_STORE,
				stored_posts;
			if(persistent_store === undefined){
				persistent_store = '';
				stored_posts = {};
			} else {
				var current_store = JSON.stringify(this._store);
				if(current_store === persistent_store) return;
				stored_posts = JSON.parse(persistent_store);
			};
			Object.keys(stored_posts).forEach(function(post_id){
				var post = stored_posts[post_id];
				this._set(post_id, post.value, post.last_updated);
			}, this);
			var new_store = JSON.stringify(this._store);
			if(persistent_store !== new_store){
				localStorage.WM_LIKE_STORE = new_store;
			}
		},
		_ajaxCallbacks: [],
		_addAjaxCallback: function(post_ids, callback){
			this._ajaxCallbacks.push(this._ajaxCallback.bind(this, post_ids, callback));
		},
		_notify: function(updates){
			var now = get_now_epoch();
			updates.forEach(function(like_status){
				this._set(like_status.post_id, like_status.state, now);
			}, this);
			this._ajaxCallbacks = this._ajaxCallbacks.filter(function(ajaxCallback){
				return !ajaxCallback();
			});
		},
		_store: {},
		_set: function(post_id, value, epoch){
			if(typeof(epoch) !== 'number'){
				epoch = get_now_epoch();
			}
			
			if(
				!(post_id in this._store) ||
				(this._store[post_id].last_updated < epoch)
			){
				this._store[post_id] = {
					last_updated: epoch,
					value: value
				};
			}
			this._delayedSyncPersistentStore();
		},
		get: function(post_ids, callback){
			if(typeof(post_ids) === 'number'){
				post_ids = [post_ids];
			};
			var now = get_now_epoch(),
				needs_updating_ids = post_ids.filter(function(post_id){
					return !(
							(post_id in this._store) &&
							((now - this._store[post_id].last_updated) < this._staleTimeout)
						)
				}, this);
			if(needs_updating_ids.length > 0){
				var ids = needs_updating_ids.slice(0);
				if(needs_updating_ids.length === 1){
					// Tumblr JS API doesn't respond correctly to single post_id requests
					ids.push(0);
				}
				Tumblr.LikeButton.get_status_by_post_ids(ids);
				this._addAjaxCallback(needs_updating_ids, callback);
			} else {
				var liked_posts = {};
				post_ids.forEach(function(post_id){
					liked_posts[post_id] = this._store[post_id].value;
				}, this);
				callback.call(undefined, liked_posts);
			}
		}
	};
	post_like_status._delayedSyncPersistentStore = Debounce(2000, post_like_status._syncPersistentStore);
	
	var cache = {
		logged_in: undefined
	},
	callback_queue = {
		'logged_in': []
	},
	page_message_queue = [],
	message_parsers = {
		'user_logged_in': function(isLoggedIn){
			cache.logged_in = (isLoggedIn === "Yes");
			var callback;
			while(callback = callback_queue.logged_in.shift()){
				callback.call(undefined, cache.logged_in);
			}
		},
		'like_state_update': function(jsonTxt){
			var update = JSON.parse(jsonTxt);
			post_like_status._notify(update);
		},
		'logged_in_iframe_loaded': function(){
			TUMBLR_IFRAME_LOADED = true;
			var message;
			while(message = message_queue.shift()){
				window.WashingMachine[message[0]].apply(window.WashingMachine, message[1]);
			}
		}
	},
	process_page_messages = Debounce(600, function(){
		console.log(page_message_queue.slice(0));
		var message;
		while(message = page_message_queue.shift()){
			var message_type = message.shift(),
				arguments = message;
			if(message_type in message_parsers){
				message_parsers[message_type].apply(this, arguments);
			}
		}
	});
	
	window.addEventListener('message', function(event){
		if(!(event.data || event.data.split)) return;
		var message = event.data.split(';');
		page_message_queue.push(message);
		process_page_messages();
	});
	
	post_like_status._syncPersistentStore();
	
	var message_queue = [];
	window.WashingMachine = {
		isLoggedIn: function(callback){
			if(cache.logged_in !== undefined){
				callback.call(undefined, cache.logged_in);
			} else {
				callback_queue.logged_in.push(callback);
			}
		},
		getLikeStatusByPostIds: function(post_ids, callback){
			if(!TUMBLR_IFRAME_LOADED){
				message_queue.push(['getLikeStatusByPostIds', arguments]);
				return;
			}
			post_like_status.get(post_ids, callback);
		}
	}
})(this);
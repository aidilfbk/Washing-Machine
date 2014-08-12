Washing Machine
===============

A Javascript wrapper around Tumblr's in-blog Javascript API. This code is still in beta so please report any bugs you find.

# Requirements
- `postMessage` – Tumblr's JS API uses it
- `addEventListener` – binding to the `message` event emitted by Tumblr's use of `postMessage`
- `localStorage` – caching the post liked status on the client-side
- `JSON` – serialising in-memory store to `localStorage`

# Installation
Include wm.js in the `<head>` of your Tumblr blog,
```html
<script src="https://cdn.rawgit.com/aidilfbk/Washing-Machine/e255f8be7edd211260bfea948359bfa8ba059a8a/wm.js"></script>
```

# Usage
## <a name="isLoggedIn"></a>Getting the visitor's login state
```javascript
WashingMachine.isLoggedIn(function(isLoggedIn){
    if(isLoggedIn){
        alert("You are currently logged in.");
    } else {
        alert("You are not logged in.")
    }
})
```
## Checking if logged in user has liked a post
This only works if the user is logged in (check using [isLoggedIn](#isLoggedIn))
```javascript
WashingMachine.getLikeStatusByPostIds([1234567], function(posts){
    Object.keys(posts).forEach(function(post_id){
        if(posts[post_id]){
            alert("Post ID: "+post_id+ "was liked.");
        } else {
            alert("Post ID: "+post_id+ "was not liked.");
        }
    })
})
```

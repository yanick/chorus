/*
SHJS - Syntax Highlighting in JavaScript
Copyright (C) 2007, 2008 gnombat@users.sourceforge.net
License: http://shjs.sourceforge.net/doc/gplv3.html

SHJS-Linenumbers
Second Author: F1skr from https://github.com/F1skr/SHJS-Linenumbers/blob/master/src/sh_main.js

SHJS-Extended
Third Author: Munawwar - https://github.com/Munawwar/SHJS-Extended
*/

if (!this.sh_languages) {
	this.sh_languages = {};
}
var sh_requests = {};

function sh_isEmailAddress(url) {
  if (/^mailto:/.test(url)) {
    return false;
  }
  return url.indexOf('@') !== -1;
}

function sh_setHref(tags, numTags, inputString) {
  var url = inputString.substring(tags[numTags - 2].pos, tags[numTags - 1].pos);
  if (url.length >= 2 && url.charAt(0) === '<' && url.charAt(url.length - 1) === '>') {
    url = url.substr(1, url.length - 2);
  }
  if (sh_isEmailAddress(url)) {
    url = 'mailto:' + url;
  }
  tags[numTags - 2].node.href = url;
}

/*
Konqueror has a bug where the regular expression /$/g will not match at the end
of a line more than once:

var regex = /$/g;
var match;

var line = '1234567890';
regex.lastIndex = 10;
match = regex.exec(line);

var line2 = 'abcde';
regex.lastIndex = 5;
match = regex.exec(line2); // fails
*/
function sh_konquerorExec(s) {
  var result = [''];
  result.index = s.length;
  result.input = s;
  return result;
}

/**
Highlights all elements containing source code in a text string. The return
value is an array of objects, each representing an HTML start or end tag. Each
object has a property named pos, which is an integer representing the text
offset of the tag. Every start tag also has a property named node, which is the
DOM element started by the tag. End tags do not have this property.
@param inputString a text string
@param language a language definition object
@return an array of tag objects
*/
function sh_highlightString(inputString, language) {
  if (/Konqueror/.test(navigator.userAgent)) {
    if (! language.konquered) {
      for (var s = 0; s < language.length; s++) {
        for (var p = 0; p < language[s].length; p++) {
          var r = language[s][p][0];
          if (r.source === '$') {
            r.exec = sh_konquerorExec;
          }
        }
      }
      language.konquered = true;
    }
  }

  var a = document.createElement('a');
  var span = document.createElement('span');

  // the result
  var tags = [];
  var numTags = 0;

  // each element is a pattern object from language
  var patternStack = [];

  // the current position within inputString
  var pos = 0;

  // the name of the current style, or null if there is no current style
  var currentStyle = null;

  var output = function(s, style) {
    var length = s.length;
    // this is more than just an optimization - we don't want to output empty <span></span> elements
    if (length === 0) {
      return;
    }
    if (! style) {
      var stackLength = patternStack.length;
      if (stackLength !== 0) {
        var pattern = patternStack[stackLength - 1];
        // check whether this is a state or an environment
        if (! pattern[3]) {
          // it's not a state - it's an environment; use the style for this environment
          style = pattern[1];
        }
      }
    }
    if (currentStyle !== style) {
      if (currentStyle) {
        tags[numTags++] = {pos: pos};
        if (currentStyle === 'sh-url') {
          sh_setHref(tags, numTags, inputString);
        }
      }
      if (style) {
        var clone;
        if (style === 'sh-url') {
          clone = a.cloneNode(false);
        }
        else {
          clone = span.cloneNode(false);
        }
        clone.className = style;
        tags[numTags++] = {node: clone, pos: pos};
      }
    }
    pos += length;
    currentStyle = style;
  };

  var endOfLinePattern = /\r\n|\r|\n/g;
  endOfLinePattern.lastIndex = 0;
  var inputStringLength = inputString.length;
  var linenum = 0;
  while (pos < inputStringLength) {
    linenum++;
    var start = pos;
    var end;
    var startOfNextLine;
    var endOfLineMatch = endOfLinePattern.exec(inputString);
    if (endOfLineMatch === null) {
      end = inputStringLength;
      startOfNextLine = inputStringLength;
    }
    else {
      end = endOfLineMatch.index;
      startOfNextLine = endOfLinePattern.lastIndex;
    }

    var line = inputString.substring(start, end);

    var matchCache = [];
    for (;;) {
      var posWithinLine = pos - start;

      var stateIndex;
      var stackLength = patternStack.length;
      if (stackLength === 0) {
        stateIndex = 0;
      }
      else {
        // get the next state
        stateIndex = patternStack[stackLength - 1][2];
      }

      var state = language[stateIndex];
      var numPatterns = state.length;
      var mc = matchCache[stateIndex];
      if (! mc) {
        mc = matchCache[stateIndex] = [];
      }
      var bestMatch = null;
      var bestPatternIndex = -1;
      for (var i = 0; i < numPatterns; i++) {
        var match;
        if (i < mc.length && (mc[i] === null || posWithinLine <= mc[i].index)) {
          match = mc[i];
        }
        else {
          var regex = state[i][0];
          regex.lastIndex = posWithinLine;
          match = regex.exec(line);
          mc[i] = match;
        }
        if (match !== null && (bestMatch === null || match.index < bestMatch.index)) {
          bestMatch = match;
          bestPatternIndex = i;
          if (match.index === posWithinLine) {
            break;
          }
        }
      }

      if (bestMatch === null) {
        output(line.substring(posWithinLine), null);
        break;
      }
      else {
        // got a match
        if (bestMatch.index > posWithinLine) {
          output(line.substring(posWithinLine, bestMatch.index), null);
        }

        var pattern = state[bestPatternIndex];

        var newStyle = pattern[1];
        var matchedString;
        if (newStyle instanceof Array) {
          for (var subexpression = 0; subexpression < newStyle.length; subexpression++) {
            matchedString = bestMatch[subexpression + 1];
            output(matchedString, newStyle[subexpression]);
          }
        }
        else {
          matchedString = bestMatch[0];
          output(matchedString, newStyle);
        }

        switch (pattern[2]) {
        case -1:
          // do nothing
          break;
        case -2:
          // exit
          patternStack.pop();
          break;
        case -3:
          // exitall
          patternStack.length = 0;
          break;
        default:
          // this was the start of a delimited pattern or a state/environment
          patternStack.push(pattern);
          break;
        }
      }
    }

    // end of the line
    if (currentStyle) {
      tags[numTags++] = {pos: pos};
      if (currentStyle === 'sh-url') {
        sh_setHref(tags, numTags, inputString);
      }
      currentStyle = null;
    }
    pos = startOfNextLine;
  }
  
  //return an array including the tags, and number of lines
  var stringsnum = new Array()
  stringsnum[0] = tags;
  stringsnum[1] = linenum;

  return stringsnum;
}

////////////////////////////////////////////////////////////////////////////////
// DOM-dependent functions

function sh_getClasses(element) {
  var result = [];
  var htmlClass = element.className;
  if (htmlClass && htmlClass.length > 0) {
    var htmlClasses = htmlClass.split(' ');
    for (var i = 0; i < htmlClasses.length; i++) {
      if (htmlClasses[i].length > 0) {
        result.push(htmlClasses[i]);
      }
    }
  }
  return result;
}

function sh_addClass(element, name) {
  var htmlClasses = sh_getClasses(element);
  for (var i = 0; i < htmlClasses.length; i++) {
    if (name.toLowerCase() === htmlClasses[i].toLowerCase()) {
      return;
    }
  }
  htmlClasses.push(name);
  element.className = htmlClasses.join(' ');
}

/**
Extracts the tags from an HTML DOM NodeList.
@param nodeList a DOM NodeList
@param result an object with text, tags and pos properties
*/
function sh_extractTagsFromNodeList(nodeList, result) {
  var length = nodeList.length;
  for (var i = 0; i < length; i++) {
    var node = nodeList.item(i);
    switch (node.nodeType) {
    case 1:
      if (node.nodeName.toLowerCase() === 'br') {
        var terminator;
        if (/MSIE/.test(navigator.userAgent)) {
          terminator = '\r';
        }
        else {
          terminator = '\n';
        }
        result.text.push(terminator);
        result.pos++;
      }
      else {
        result.tags.push({node: node.cloneNode(false), pos: result.pos});
        sh_extractTagsFromNodeList(node.childNodes, result);
        result.tags.push({pos: result.pos});
      }
      break;
    case 3:
    case 4:
      result.text.push(node.data);
      result.pos += node.length;
      break;
    }
  }
}

/**
Extracts the tags from the text of an HTML element. The extracted tags will be
returned as an array of tag objects. See sh_highlightString for the format of
the tag objects.
@param element a DOM element
@param tags an empty array; the extracted tag objects will be returned in it
@return the text of the element
@see sh_highlightString
*/
function sh_extractTags(element, tags) {
  var result = {};
  result.text = [];
  result.tags = tags;
  result.pos = 0;
  sh_extractTagsFromNodeList(element.childNodes, result);
  return result.text.join('');
}

/**
Merges the original tags from an element with the tags produced by highlighting.
@param originalTags an array containing the original tags
@param highlightTags an array containing the highlighting tags - these must not overlap
@result an array containing the merged tags
*/
function sh_mergeTags(originalTags, highlightTags) {
  var numOriginalTags = originalTags.length;
  if (numOriginalTags === 0) {
    return highlightTags;
  }

  var numHighlightTags = highlightTags.length;
  if (numHighlightTags === 0) {
    return originalTags;
  }

  var result = [];
  var originalIndex = 0;
  var highlightIndex = 0;

  while (originalIndex < numOriginalTags && highlightIndex < numHighlightTags) {
    var originalTag = originalTags[originalIndex];
    var highlightTag = highlightTags[highlightIndex];

    if (originalTag.pos <= highlightTag.pos) {
      result.push(originalTag);
      originalIndex++;
    }
    else {
      result.push(highlightTag);
      if (highlightTags[highlightIndex + 1].pos <= originalTag.pos) {
        highlightIndex++;
        result.push(highlightTags[highlightIndex]);
        highlightIndex++;
      }
      else {
        // new end tag
        result.push({pos: originalTag.pos});

        // new start tag
        highlightTags[highlightIndex] = {node: highlightTag.node.cloneNode(false), pos: originalTag.pos};
      }
    }
  }

  while (originalIndex < numOriginalTags) {
    result.push(originalTags[originalIndex]);
    originalIndex++;
  }

  while (highlightIndex < numHighlightTags) {
    result.push(highlightTags[highlightIndex]);
    highlightIndex++;
  }

  return result;
}

/**
Inserts tags into text.
@param tags an array of tag objects
@param text a string representing the text
@return a DOM DocumentFragment representing the resulting HTML
*/
function sh_insertTags(tags, text) {
  var doc = document;

  var result = document.createDocumentFragment();
  var tagIndex = 0;
  var numTags = tags.length;
  var textPos = 0;
  var textLength = text.length;
  var currentNode = result;

  // output one tag or text node every iteration
  while (textPos < textLength || tagIndex < numTags) {
    var tag;
    var tagPos;
    if (tagIndex < numTags) {
      tag = tags[tagIndex];
      tagPos = tag.pos;
    }
    else {
      tagPos = textLength;
    }

    if (tagPos <= textPos) {
      // output the tag
      if (tag.node) {
        // start tag
        var newNode = tag.node;
        currentNode.appendChild(newNode);
        currentNode = newNode;
      }
      else {
        // end tag
        currentNode = currentNode.parentNode;
      }
      tagIndex++;
    }
    else {
      // output text
      currentNode.appendChild(doc.createTextNode(text.substring(textPos, tagPos)));
      textPos = tagPos;
    }
  }

  return result;
}

function shx_selectAll(element) {
	if(window.getSelection) { //Selection Object. FF/Chrome/Opera/IE9
		window.getSelection().selectAllChildren(element);
	} else if(document.selection) { //IE8
		var range=document.selection.createRange();
		range.moveToElementText(element);
		range.select();
	}
}

//Internal functions
function _inArray(array,find) {
	for(var i=0;i<array.length;i++) {
		if(array[i]==find){
			return true;
		}
	}
	return false;
}
function _hasClass(element,className) {
	var classes=element.className.split(" ");
	return _inArray(classes,className);
}
function _isBrace(ch) {
	return (ch=='(' || ch==')' || ch=='{' || ch=='}' || ch=='[' || ch==']');
}
function _isOpenBrace(ch) {
	return (ch=='(' || ch=='{' || ch=='[');
}
function _isClosedBrace(ch) {
	return (ch==')' || ch=='}' || ch==']');
}
function _isVarNameChar(ch) {
	/* I am taking a safe character set that represents variable/function/class names for most languages.
	 * LISP and CSS can take hyphens in their variable/class names. But currently I am not including it.
	 */
	return !( (ch<'a' || ch>'z') && (ch<'A' || ch>'Z') && (ch<'0' || ch>'9') && ch!='$' && ch!='_' );
}

var shx_hilitedBraces=new Array; //Array to keep track of highlighted braces
/**
 * @description Unhighlights all braces highlighted by shx_hilitBrace function.
 */
function shx_unhilitBrace() {
	while(shx_hilitedBraces.length) {
		var node=shx_hilitedBraces.pop();
		var parent=node.parentNode;
		parent.parentNode.replaceChild(node,parent);
	}
}
/**
 * @description Find the matching end brace to the brace given as argument, and highlights it (using a span element and defined CSS class)
 * @param {HTMLPreElement} element
 * @param {TextNode} textNode The text node in which the start/end brace occurs.
 * @param {number} braceOffset Offset within the text node where the brace occurs.
 * @param {String} brace The brace character. Should be a single character and can be an open or close brace. The word 'brace' means either curly brace {, bracket ( or square-bracket [ .
 */
function shx_hilitBrace(element,textNode,braceOffset,brace) {
	var _nextNode = function(_node) {
		return _node.firstChild || _node.nextSibling || (_node.parentNode!==element ? _node.parentNode.nextSibling : false);
	}
	var _prevNode = function(_node) {
		return _node.lastChild || _node.previousSibling || (_node.parentNode!==element ? _node.parentNode.previousSibling : false);
	}
	var _hilit=function(_node) {
		var span=document.createElement('span');
		span.setAttribute('class','shx-hilit-brace');
		_node.parentNode.replaceChild(span,_node);
		span.appendChild(_node);
		shx_hilitedBraces.push(_node);
	}
	
	var otherBrace;
	switch(brace) {
		case '(': {otherBrace=')'; break;}
		case ')': {otherBrace='('; break;}
		case '{': {otherBrace='}'; break;}
		case '}': {otherBrace='{'; break;}
		case '[': {otherBrace=']'; break;}
		case ']': {otherBrace='['; break;}
		default: return;
	}
	
	// Unhighlight previous matches.
	shx_unhilitWord(element);
	shx_unhilitBrace();
	//No normalizing, because that might change the text node of the start brace
	
	//Step 1.1: split textNode and isolate 'brace' into its own text node
	if(braceOffset!=0) {
		textNode=textNode.splitText(braceOffset);
		braceOffset=0;
	}
	if((braceOffset+1)<textNode.length) {
		textNode.splitText(braceOffset+1);
	}
	
	//Step 1.2: Traverse the DOM (in the appropriate direction) and find the end brace.
	var node=textNode, text=textNode.nodeValue, stack=[brace], pos;
	var domIt = _isOpenBrace(brace)? _nextNode : _prevNode; //Dom Iterator function
	var inc = _isOpenBrace(brace)? 1: -1; //Increment value
	
	for(node=domIt(node); node && stack.length>0; node=domIt(node)) {
		if(node.nodeType==3) { //Text node
			text=node.nodeValue;
			for(pos=((inc==1)?0:(text.length-1)); pos>=0 && pos<text.length; pos+=inc) {
				if(text[pos]==brace) {
					stack.push(brace);
				} else if(text[pos]==otherBrace) {
					stack.pop();
				}
				if(stack.length==0) {break;}
			}
		}
		if(stack.length==0) {break;}
	}
	if(node) {
		//Isolate the end brace
		if(pos!=0) {
			node=node.splitText(pos);
			pos=0;
		}
		if((pos+1)<node.length) {
			node.splitText(pos+1);
		}
		_hilit(textNode);
		_hilit(node);
	}
	
	//Join adjacent text nodes
	element.normalize();
}

/**
 * @description Unhighlight all marked words
 * @param {HTMLPreElement} element
 */
function shx_unhilitWord(element) {
	var _nextNode = function(_node) {
		return _node.firstChild || _node.nextSibling || (_node.parentNode!==element ? _node.parentNode.nextSibling : false);
	}
	for(var node=element.firstChild; node; node=_nextNode(node) ) {
		if(node.nodeType==3) {//Text node
			// Remove hilit if any
			if(_hasClass(node.parentNode,'shx-hilit')) {
				var parent=node.parentNode;
				parent.parentNode.replaceChild(node,parent);
			}
		}
	}
}

/**
 * @description Finds all occurances of a word in a pre element and marks/highlights them (using a span element and defined CSS class).
 * @param {HTMLPreElement} element
 * @param {String} word Word to find
 * @param {Boolean} [wholeWord] Optional: When true, matches only whole words. Defaults to true.
 */
function shx_hilitWord(element,word,wholeWord) {
	if(!wholeWord) wholeWord=true;
	var _nextNode = function(_node) {
		return _node.firstChild || _node.nextSibling || (_node.parentNode!==element ? _node.parentNode.nextSibling : false);
	}
	
	//Step 0: Unhilit braces and join adjacent text nodes. 
	shx_unhilitBrace();
	element.normalize();
	
	/* Step 1: Get all text nodes and their node value length. 
	 * This is an optimization, rather than traversing the DOM multiple times.
	 * Also get all text from 'element' node.
	 */
	var textNodes=[], nodePos=[], text='',len=0;
	//Iterate through child nodes
	for(var node=element.firstChild; node; node=_nextNode(node) ) {
		if(node.nodeType==3) {//Text node
			//Remove hilit if hilit'ed
			if(_hasClass(node.parentNode,'shx-hilit')) {
				var parent=node.parentNode;
				parent.parentNode.replaceChild(node,parent);
			}
			textNodes.push(node);
			nodePos.push(len);
			text+=node.nodeValue;
			len+=node.nodeValue.length;
		}
	}
	nodePos.push(len); //To make calculations easier at step 3.
	
	/*Step 2: Get word match positions*/ 
	var matchPos=[];
	len=word.length;
	for(var pos=text.indexOf(word); pos!=-1; pos=text.indexOf(word,pos+len)) {
		// Match whole words only. Check if character before and after the match is not one of the 'variable name' characters.
		if(wholeWord) {
			var ok = ((pos-1)<0 || ((pos-1)>=0 && !_isVarNameChar(text[pos-1])));
			if(ok && ((pos+len)>=text.length || ((pos+len)<text.length && !_isVarNameChar(text[pos+len]))) ) {
				matchPos.push(pos);
			}
		} else {
			matchPos.push(pos); //Not tested so far
		}
	}
	
	//Private function
	var _hilit=function(_node) {
		var span=document.createElement('span');
		span.setAttribute('class','shx-hilit');
		span.setAttribute('title','Count : '+matchPos.length);
		_node.parentNode.replaceChild(span,_node);
		span.appendChild(_node);
	}
	
	/*Step 3: Highlight the text nodes*/
	var matchIndex=0, startNode=false, pos=matchPos[matchIndex], newNode;
	var hilitQueue=[];
	for(var i=0;i<textNodes.length;i++) {
		if(pos>=nodePos[i] && pos<nodePos[i+1]) {
			startNode=!startNode;
			//Split text node if required
			var diff=pos-nodePos[i];
			if(diff!=0 && diff!=textNodes[i].nodeValue.length) {
				newNode=textNodes[i].splitText(diff);
				textNodes.splice(i+1,0,newNode);
				nodePos.splice(i+1,0,pos);
			} else {
				newNode=textNodes[i];
				i--; //No split has taken place. So make sure we goes through the current i value once again.
			}
			
			if(startNode) {
				hilitQueue.push(newNode);
			}
			else {
				if(diff!=0 && textNodes[i]!=hilitQueue[hilitQueue.length-1]) {
					hilitQueue.push(textNodes[i]);
				}
				for(var k=0; k<hilitQueue.length; k++) {
					_hilit(hilitQueue[k]);
				}
				hilitQueue=[];
			}
			pos = startNode? (matchPos[matchIndex]+len) : matchPos[++matchIndex];
		} else if(startNode && textNodes[i]!=hilitQueue[hilitQueue.length-1]) {
			hilitQueue.push(textNodes[i]);
		}
	}
	
	//Join adjacent textnodes
	element.normalize();
}

/**
 * @description Manages the highlighting/marking process of words and braces based on user selection.
 */
function shx_hilit(event,element) { //Gets the first range object
	if (window.getSelection) { // Firefox/Chrome/Safari/Opera/IE9
		var range=null;
		try {
			range=window.getSelection().getRangeAt(0); //W3C DOM Range Object
		} catch(e) {
			//If no text is selected an exception might be thrown
			return;
		}
		if(range.startContainer) {
			var range2=document.createRange();
			range2.selectNode(range.startContainer); //Select all text of range.startContainer
			var text=range2.toString();
			
			//Check if brace/bracket highlight is applicable
			var startPos=range.startOffset;
			if( _isBrace(text[startPos]) || (startPos>0 && _isBrace(text[startPos-1])) ) {
				var pos = _isBrace(text[startPos]) ? startPos : (startPos-1);
				var brace=text[pos];
				shx_hilitBrace(element,range.startContainer,pos,brace);
			} else {
				//Get the word which user intended to highlight
				startPos=range.startOffset, endPos=startPos;
				for(;startPos>=0 && _isVarNameChar(text[startPos]) ;startPos--) {}
				startPos++;
				for(;endPos<text.length && _isVarNameChar(text[endPos]);endPos++) {}
				if(startPos<endPos) {
					var word=text.substring(startPos,endPos);
					shx_hilitWord(element,word);
				}
			}
		}
	}
	else if(window.document.selection) { // IE8
		var range=window.document.selection.createRange(); //Microsoft TextRange Object
		var _findNode = function(parentElement,text) {
			//Iterate through all the child text nodes and check for matches
            //As we go through each text node keep removing the text value (substring) from the beginning of the text variable.
            var container=null, offset=-1;
            for(var node=parentElement.firstChild; node; node=node.nextSibling) {
                if(node.nodeType==3) {//Text node
                    var find=node.nodeValue;
                    var pos=text.indexOf(find);
                    if(pos==0 && text!=find) { //text==find is a special case
                        text=text.substring(find.length);
                    } else {
                        container=node;
						offset=text.length-1
                        break;
                    }
                }
            }
			return {node: container,offset: offset}; //nodeInfo
		}
		
		if(range.text.length==0) {
			var range2=range.duplicate(), moved, brace=null;
			
			moved=range2.moveStart('character',-1);
			if(moved!=0) {
				if(_isBrace(range2.text[0]))
					brace=range2.text[0];
				else
					range2.moveStart('character',1);
			}
			if(!brace) {
				moved=range2.moveStart('character',1);
				if(moved!=0) {
					if(_isBrace(range2.text[0]))
						brace=range2.text[0];
					else
						range2.moveStart('character',-1);
				}
			}
			if(brace) {
				//Logic taken from http://stackoverflow.com/questions/1223324/selection-startcontainer-in-ie/6780205#6780205
				var parentElement=range2.parentElement();
				var rangeObj=document.body.createTextRange();
				rangeObj.moveToElementText(parentElement); //Select all text of parentElement
				rangeObj.setEndPoint('EndToEnd',range2); //Set end point to the first character of the 'real' selection
				var nodeInfo=_findNode(parentElement,rangeObj.text);
				shx_hilitBrace(element,nodeInfo.node,nodeInfo.offset,brace);
			} else {
				//Get the word which user intended to highlight
				//Move backward
				do {
					moved=range2.moveStart('character',-1);
				} while(moved!=0 && _isVarNameChar(range2.text[0]));
				moved=range2.moveStart('character',1);
				//Move forward
				while(moved!=0 && _isVarNameChar(range2.text[range2.text.length-1])) {
					moved=range2.moveEnd('character',1);
				}
				range2.moveEnd('character',-1);
				if(range2.text.length>0) {
					var word=range2.text;
					shx_hilitWord(element,word);
				}
			}
		}
	}
}
/**
* Add linenumbers
* Wraps a table around the pre tag, including linenumbers left of the code
* Make mark and copy easy without accidentally copiyng all the linenumbers
*
* @param element, the pre element including the highlighted code
* @param lines, the number of code lines (calculated in sh_highlightString())
* @see sh_highlightString
*/
function sh_lineNumbers(element, lines) {
  element.onmouseup=function(event) {shx_hilit(event,element);}
  
  //Parent wrapper
  var wrapperDiv=document.createElement('div'), innerWrapper=document.createElement('div');
  wrapperDiv.setAttribute('class','shx-wrapper');
  innerWrapper.setAttribute('class','shx-innerWrapper');
  
  var topbar=document.createElement('div');
  topbar.setAttribute('class','shx-topbar');
  
  //Options toolbar
  var actions=document.createElement('span'), selectSpan=document.createElement('span');
  actions.setAttribute('class','shx-actions');
  selectSpan.appendChild(document.createTextNode('Select All'));
  selectSpan.onclick=function() {shx_selectAll(element); selectSpan=null;}
  actions.appendChild(selectSpan);
  
  var title=element.getAttribute("title");
  if(title!=null && title.length>0) {
	element.removeAttribute("title"); 
	topbar.appendChild(document.createTextNode(title));
  }
  topbar.appendChild(actions);
  
  //create line number element
  var lineNumbers = document.createElement('pre');
  lineNumbers.setAttribute('class','shx-linenum'); //add class for css styling
  
  //add line numbers
  var html='';
  for(var i = 1; i <= lines; i++) {
	html = html + ('<span>'+i+"</span>\n");
  }
  lineNumbers.innerHTML = html;
  
  //Append to wrapper span
  wrapperDiv.appendChild(topbar);
  wrapperDiv.appendChild(innerWrapper);
  
  //replace element with the new table code structure
  element.parentNode.replaceChild(wrapperDiv, element);
  
  //wrap each element appropriately
  innerWrapper.appendChild(lineNumbers);
  innerWrapper.appendChild(element);
  
  //Making both column of table of same height
  lineNumbers.style.paddingBottom=0;
  var diff=element.offsetHeight - lineNumbers.clientHeight;
  lineNumbers.style.paddingBottom=(diff)+'px';
  
  //Adjust height of topbar
  topbar.style.height = (actions.offsetHeight) +'px';
}

/**
Highlights an element containing source code. Upon completion of this function,
the element will have been placed in the "sh_sourceCode" class.
@param element a DOM <pre> element containing the source code to be highlighted
@param language a language definition object
*/
function sh_highlightElement(element, language) {
  sh_addClass(element, 'sh-sourceCode');
  var originalTags = [];
  var inputString = sh_extractTags(element, originalTags);
  var highligtedStrings = sh_highlightString(inputString, language);
  var highlightTags = highligtedStrings[0];
  var tags = sh_mergeTags(originalTags, highlightTags);
  var documentFragment = sh_insertTags(tags, inputString);
  while (element.hasChildNodes()) {
    element.removeChild(element.firstChild);
  }
  element.appendChild(documentFragment);
  
  sh_lineNumbers(element, highligtedStrings[1]);
}

function sh_getXMLHttpRequest() {
  if (window.ActiveXObject) {
    return new ActiveXObject('Msxml2.XMLHTTP');
  }
  else if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  throw 'No XMLHttpRequest implementation available';
}

/**
 * Function that takes care of loading a language script.
 * Changes: Does not use AJAX and eval to load the script, rather puts a 'script' tag on the document
 * head that loads the script. The language script have been modified to accomodate the changes.
 * The url to the script = prefix + 'sh_' + language + suffix.
 * prefix can be path to language folder, and suffix mostly is either .js or .min.js.
 * @param {HTMLPreElement} element
 */
function sh_load(language, element, prefix, suffix) {
	if (language in sh_requests) {
		sh_requests[language].push(element);
		return;
	}
	sh_requests[language] = [element];
	var url = prefix + 'lang/sh_' + language + suffix; //This one is underscore, since js files are named with _
	var script=document.createElement('script');
	script.setAttribute('type','text/javascript');
	script.setAttribute('src',url);
	var head=document.getElementsByTagName('head');
	if(head && head[0]) {
		head[0].appendChild(script);
	} else {
		document.body.appendChild(script);
	}
}

/**
 * This function highlights the elements that were waiting in the request queue for the given language.
 * This function is called at the end of language files,
 * which effectively means that the function is called after completion of loading of a language file.
 * @param {String} language Language string. Eg: 'cpp','js'.
 */
function sh_afterLoad(language) {
	var elements = sh_requests[language];
	for (var i = 0; i < elements.length; i++) {
		sh_highlightElement(elements[i], sh_languages[language]);
	}
}

/**
Highlights all elements containing source code on the current page. Elements
containing source code must be "pre" elements with a "class" attribute of
"sh_LANGUAGE", where LANGUAGE is a valid language identifier; e.g., "sh_java"
identifies the element as containing "java" language source code.
*/
function sh_highlightDocument(prefix, suffix) {
  var _nodeList = document.getElementsByTagName('pre'), nodeList=[];
  
  //IE8 (IE9 also?) keeps updating the nodeList, which I don't want. So I am going make a copy.
  for (var i = 0; i < _nodeList.length; i++) {
	nodeList.push(_nodeList.item(i));
  }
  
  for (var i = 0; i < nodeList.length; i++) {
    var element = nodeList[i];
    var htmlClasses = sh_getClasses(element);
    for (var j = 0; j < htmlClasses.length; j++) {
      var htmlClass = htmlClasses[j].toLowerCase();
      if (htmlClass === 'sh-sourcecode') {
        continue;
      }
      if (htmlClass.substr(0, 3) === 'sh-') {
        var language = htmlClass.substring(3);
        if (language in sh_languages) {
          sh_highlightElement(element, sh_languages[sh_lang]);
        }
        else if (typeof(prefix) === 'string' && typeof(suffix) === 'string') {
          sh_load(language, element, prefix, suffix);
        }
        else {
          throw 'Found <pre> element with class="' + htmlClass + '", but no such language exists';
        }
        break;
      }
    }
  }
}
Array.prototype.customRepeat = function( defaultValue, size ) //custom initializer
{
	while ( size )
	{
		this[ --size ] = defaultValue;
	}
	return this;
};

var miner = miner || {}; //namespace

miner.drawer = function( canvasId, size )
{
	var _self = this;

	var _canvas = document.getElementById( canvasId );

	var _ctx = _canvas.getContext( '2d' );

	var _actors = [];

	//are translated into Images
	var _images = {
		WALL        : "wall.svg",
		GOLD        : "gold.svg",
		MINER       : "miner.svg",
		ERROR       : "missing-texture.svg",
		UNKNOWN     : "unknown.png",
		EMPTY       : "ground.svg",
		TARGET      : "target.svg",
		TARGET_GOLD : "target-gold.svg",
		MINER_SELF  : "miner-self.svg"
	};

	var _size = size;

	var _cellStates = Object.freeze( { EMPTY : 0, WALL : 1, GOLD : 2, MINER : 3, UNKNOWN : 4, MINER_SELF : 5 } );

	var _newCellState = _cellStates.GOLD;

	var _fieldCells = [].customRepeat( _cellStates.EMPTY, _size * _size );

	var _timeInterval = 200;

	var _simulationInterval;

	var _currentActor = null;

	window.addEventListener( "resize", function()
	{
		update();
	} );

	_canvas.addEventListener( "click", function( event )
	{
		var nIndex = Math.floor( event.offsetY / (_canvas.height / _size) ) * _size
			+ Math.floor( event.offsetX / (_canvas.width / _size) );

		if ( _newCellState === _cellStates.EMPTY )
		{
			_fieldCells[ nIndex ] = _cellStates.EMPTY;
			for ( var ind = 0; ind < _actors.length; ++ind )
			{
				if ( _actors[ ind ].getCurrentIndex() === nIndex )
				{
					if ( ind === _currentActor )
					{
						++_currentActor;
					}
					_actors.splice( ind, 1 );
					if ( _actors.length === 0 )
					{
						_currentActor = null;
					}
					else if ( _currentActor >= _actors.length )
					{
						_currentActor = 0;
					}
					break;
				}
			}
		}
		else if ( _fieldCells[ nIndex ] === _cellStates.EMPTY )
		{
			_fieldCells[ nIndex ] = _newCellState;
			if ( _newCellState === _cellStates.MINER )
			{
				_actors.push( new Actor( nIndex ) );
				_currentActor = _actors.length - 1;
			}
		}

		update();
	} );

	function update()
	{
		_canvas.width  = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth;
		_canvas.height = _canvas.width;

		drawField();
		drawContent( _fieldCells );
		if ( _currentActor !== null )
		{
			if ( _actors[ _currentActor ] !== undefined )
			{
				drawContent( _actors[ _currentActor ].getLocalFieldCells(),
					0.7,
					_actors[ _currentActor ].getTargetIndexes(),
					_actors[ _currentActor ].getTargetIndexesGold(),
					_actors[ _currentActor ].getMemoryCooldownCells(),
					_actors[ _currentActor ].getMemoryCooldownValue() );
			}
		}
	}

	function drawField()
	{
		_ctx.lineWidth   = 2;
		_ctx.strokeStyle = "grey";
		_ctx.beginPath();
		for ( var nIndex = 0; nIndex <= _size; ++nIndex )
		{
			_ctx.moveTo( 0, nIndex * (_canvas.height / _size) );
			_ctx.lineTo( _canvas.width, nIndex * (_canvas.height / _size) );
			_ctx.moveTo( nIndex * (_canvas.width / _size), 0 );
			_ctx.lineTo( nIndex * (_canvas.width / _size), _canvas.height );
		}
		_ctx.stroke();
	}

	function drawContent( _fieldCells,
						  opacity,
						  targetIndexes,
						  targetIndexesGold,
						  memoryCooldownCells,
						  memoryCooldownValue )
	{
		opacity             = opacity || 1;
		targetIndexes       = targetIndexes || [];
		targetIndexesGold   = targetIndexesGold || [];
		memoryCooldownCells = memoryCooldownCells || [];
		memoryCooldownValue = memoryCooldownValue || null;
		_ctx.globalAlpha    = opacity;
		for ( var nIndex = 0; nIndex < _size * _size; ++nIndex )
		{
			var img = _images.ERROR;

			for ( var prop in _cellStates )
			{
				if ( _cellStates.hasOwnProperty( prop )
					&& _cellStates[ prop ] === _fieldCells[ nIndex ]
					&& _images.hasOwnProperty( prop ) )
				{
					img = _images[ prop ];
				}
			}
			if ( targetIndexes.indexOf( nIndex ) !== -1 )
			{
				_ctx.drawImage( _images.TARGET, (nIndex % _size) * _canvas.width / _size,
					Math.floor( nIndex / _size ) * _canvas.height / _size,
					_canvas.width / _size, _canvas.height / _size );
			}
			if ( targetIndexesGold.indexOf( nIndex ) !== -1 )
			{
				_ctx.drawImage( _images.TARGET_GOLD, (nIndex % _size) * _canvas.width / _size,
					Math.floor( nIndex / _size ) * _canvas.height / _size,
					_canvas.width / _size, _canvas.height / _size );
			}
			if ( img !== _images.UNKNOWN )
			{
				_ctx.drawImage( img, (nIndex % _size) * _canvas.width / _size,
					Math.floor( nIndex / _size ) * _canvas.height / _size,
					_canvas.width / _size, _canvas.height / _size );
			}
			if ( memoryCooldownCells.length > 0 )
			{
				_ctx.globalAlpha = /*opacity **/ ( 1 - (memoryCooldownCells[ nIndex ] / memoryCooldownValue) );
				_ctx.drawImage( _images.UNKNOWN, (nIndex % _size) * _canvas.width / _size,
					Math.floor( nIndex / _size ) * _canvas.height / _size,
					_canvas.width / _size, _canvas.height / _size );
				_ctx.globalAlpha = opacity;
			}
		}
	}

	function init()
	{
		var callbacksCount = 0;
		for ( var key in _images )
		{
			if ( _images.hasOwnProperty( key ) )
			{
				var img        = new Image();
				img.src        = _images[ key ];
				_images[ key ] = img;
				++callbacksCount;
				_images[ key ].onload = function()
				{
					--callbacksCount;
					if ( callbacksCount === 0 )
					{
						_canvas.style.display = "inline";
						_self.changeSpeed( 0 ); //initialization
						update();
					}
				}
			}
		}
	}

	this.changeSpeed = function( delta )
	{
		clearInterval( _simulationInterval );
		_timeInterval       = _timeInterval + delta;
		_timeInterval       = _timeInterval > 0 ? _timeInterval : 0;
		_simulationInterval = setInterval( function()
		{
			for ( var ind = 0; ind < _actors.length; ++ind )
			{
				_actors[ ind ].tick();
			}
			update();
		}, _timeInterval );
	};

	this.changeCurrentActor = function( where )
	{
		if ( _currentActor !== null )
		{
			_currentActor = _currentActor + where;
			if ( _currentActor >= _actors.length )
			{
				_currentActor = 0;
			}
			if ( _currentActor < 0 )
			{
				_currentActor = _actors.length - 1;
			}
		}
	};

	this.changeNewCellState = function( newCellState )
	{
		if ( _cellStates.hasOwnProperty( newCellState ) )
		{
			_newCellState = _cellStates[ newCellState ];
		}
	};

	init();

	function Actor( nStartIndex )
	{
		var _self = this;

		var _localFieldCells = [].customRepeat( _cellStates.UNKNOWN, _size * _size );

		_localFieldCells[ nStartIndex ] = _cellStates.MINER_SELF;

		var _memoryCooldownValue = 100;
		var _memoryCooldownCells = [].customRepeat( 0, _size * _size );

		_memoryCooldownCells[ nStartIndex ] = _memoryCooldownValue;

		var _currentIndex = nStartIndex;

		var _targetIndexes     = [];
		var _targetIndexesGold = [];

		var _weights;
		var _parentIndexes;

		var _currentTargetIndex;
		var _currentPath;

		this.tick = function()
		{
			//TODO: optimize somehow?
			_targetIndexes     = _targetIndexes.filter( function( e )
			{
				return e !== _currentIndex;
			} );
			_targetIndexesGold = _targetIndexesGold.filter( function( e )
			{
				return e !== _currentIndex;
			} );

			if ( localCellsChanged() || _currentPath.length === 0 )
			{
				//agent's beliefs about the field changed or current target reached
				calculateRoutes();
			}

			moveTo( _currentPath.pop() );
		};

		this.getLocalFieldCells = function()
		{
			return _localFieldCells;
		};

		this.getCurrentIndex = function()
		{
			return _currentIndex;
		};

		this.getTargetIndexes = function()
		{
			return _targetIndexes
		};

		this.getTargetIndexesGold = function()
		{
			return _targetIndexesGold;
		};

		this.getMemoryCooldownCells = function()
		{
			return _memoryCooldownCells;
		};

		this.getMemoryCooldownValue = function()
		{
			return _memoryCooldownValue;
		};

		function moveTo( nIndex )
		{
			if ( nIndex !== undefined )
			{
				_fieldCells[ _currentIndex ]      = _cellStates.EMPTY;
				_localFieldCells[ _currentIndex ] = _cellStates.EMPTY;

				_fieldCells[ nIndex ]      = _cellStates.MINER;
				_localFieldCells[ nIndex ] = _cellStates.MINER_SELF;

				_currentIndex = nIndex;
			}
		}

		function calculateRoutes()
		{
			_weights                        = [].customRepeat( Infinity, _size * _size );
			_weights[ _currentIndex ]       = 0;
			_parentIndexes                  = [];
			_parentIndexes[ _currentIndex ] = _currentIndex;

			calculateCell( _currentIndex );

			_weights[ _currentIndex ] = Infinity;

			calculateCurrentPath();

		}

		function calculateCurrentPath()
		{
			_currentPath = [];

			_currentTargetIndex = calculateCurrentTargetIndex( _targetIndexesGold );

			if ( _currentTargetIndex === _currentIndex )
			{
				_currentTargetIndex = calculateCurrentTargetIndex( _targetIndexes );
			}

			var indexIterator = _currentTargetIndex;
			while ( indexIterator !== _currentIndex )
			{
				_currentPath.push( indexIterator );
				indexIterator = _parentIndexes[ indexIterator ];
			}
		}

		function calculateCurrentTargetIndex( targetIndexes )
		{
			var currentTargetIndex = _currentIndex;

			for ( var ind = 0; ind < targetIndexes.length; ++ind )
			{
				if ( _weights[ targetIndexes[ ind ] ] < _weights[ currentTargetIndex ] )
				{
					currentTargetIndex = targetIndexes[ ind ];
				}
				else if ( _weights[ targetIndexes[ ind ] ] === _weights[ currentTargetIndex ] )
				{
					if ( (currentTargetIndex !== _currentIndex) && (Math.random() < 0.25) )
					{
						currentTargetIndex = targetIndexes[ ind ];
					}
				}
			}

			return currentTargetIndex;
		}

		function calculateCell( nIndex )
		{
			var nIndexes = getNearbyIndexes( nIndex );

			for ( var ind = 0; ind < 4; ++ind )
			{
				if ( nIndexes[ ind ] !== false )
				{
					if ( _localFieldCells[ nIndexes[ ind ] ] === _cellStates.EMPTY
						|| _localFieldCells[ nIndexes[ ind ] ] === _cellStates.GOLD )
					{
						if ( (_weights[ nIndex ] + 1) < _weights[ nIndexes[ ind ] ] )
						{
							_weights[ nIndexes[ ind ] ]       = (_weights[ nIndex ] + 1);
							_parentIndexes[ nIndexes[ ind ] ] = nIndex;

							calculateCell( nIndexes[ ind ] );
						}
					}
				}
			}
		}

		function localCellsChanged()
		{
			var seen      = seenNewCells();
			var forgotten = forgottenCells();
			return (seen || forgotten);
		}

		function seenNewCells()
		{
			_memoryCooldownCells[ _currentIndex ] = _memoryCooldownValue;
			var nIndexes                          = getNearbyIndexes( _currentIndex );
			var changed                           = false;
			for ( var ind = 0; ind < 4; ++ind )
			{
				if ( nIndexes[ ind ] !== false )
				{
					_memoryCooldownCells[ nIndexes[ ind ] ] = _memoryCooldownValue;
					if ( _localFieldCells[ nIndexes[ ind ] ] !== _fieldCells[ nIndexes[ ind ] ] )
					{
						var oldState                        = _localFieldCells[ nIndexes[ ind ] ];
						_localFieldCells[ nIndexes[ ind ] ] = _fieldCells[ nIndexes[ ind ] ];

						if ( oldState === _cellStates.UNKNOWN )
						{
							var indexes = getNearbyIndexes( nIndexes[ ind ] );
							for ( var itr = 0; itr < 4; ++itr )
							{
								if ( _targetIndexes.indexOf( indexes[ itr ] ) !== -1 )
								{
									if ( getNearbyCells( indexes[ itr ], _cellStates.UNKNOWN ).length === 0 )
									{
										_targetIndexes = _targetIndexes.filter( function( e )
										{
											return e !== indexes[ itr ];
										} );
									}
								}
							}
						}

						if ( _localFieldCells[ nIndexes[ ind ] ] === _cellStates.GOLD )
						{
							_targetIndexesGold.push( nIndexes[ ind ] );
						}
						changed = true;
						if ( getNearbyCells( nIndexes[ ind ], _cellStates.UNKNOWN ).length > 0 )
						{
							if ( _localFieldCells[ nIndexes[ ind ] ] === _cellStates.EMPTY )
							{
								_targetIndexes.push( nIndexes[ ind ] );
							}
						}
						if ( _localFieldCells[ nIndexes[ ind ] ] !== _cellStates.EMPTY )
						{
							_targetIndexes = _targetIndexes.filter( function( e )
							{
								return e !== nIndexes[ ind ];
							} );
						}
						if ( _localFieldCells[ nIndexes[ ind ] ] !== _cellStates.GOLD )
						{
							_targetIndexesGold = _targetIndexesGold.filter( function( e )
							{
								return e !== nIndexes[ ind ];
							} );
						}
					}
				}
			}
			return changed;
		}

		function forgottenCells()
		{
			var changed = false;
			for ( var ind = 0; ind < _memoryCooldownCells.length; ++ind )
			{
				if ( _memoryCooldownCells[ ind ] > 0 )
				{
					--_memoryCooldownCells[ ind ];
					if ( _memoryCooldownCells[ ind ] === 0 )
					{
						changed                 = true;
						_localFieldCells[ ind ] = _cellStates.UNKNOWN;
						_targetIndexes.push.apply( _targetIndexes, getNearbyCells( ind, _cellStates.EMPTY ) );
						_targetIndexesGold.push.apply( _targetIndexesGold, getNearbyCells( ind, _cellStates.GOLD ) );
						_targetIndexes     = _targetIndexes.filter( function( e )
						{
							return e !== ind;
						} );
						_targetIndexesGold = _targetIndexesGold.filter( function( e )
						{
							return e !== ind;
						} );
					}
				}
			}
			return changed;
		}

		function getNearbyCells( nIndex, state )
		{
			var result   = [];
			var nIndexes = getNearbyIndexes( nIndex );
			for ( var ind = 0; ind < 4; ++ind )
			{
				if ( nIndexes[ ind ] !== false )
				{
					if ( _localFieldCells[ nIndexes[ ind ] ] === state )
					{
						result.push( nIndexes[ ind ] );
					}
				}
			}
			return result;
		}

		function getNearbyIndexes( nIndex )
		{
			return [ getUpIndex( nIndex ), getRightIndex( nIndex ), getDownIndex( nIndex ), getLeftIndex( nIndex ) ];
		}

		function getUpIndex( nIndex )
		{
			return nIndex - _size >= 0 ? nIndex - _size : false;
		}

		function getRightIndex( nIndex )
		{
			return Math.floor( (nIndex + 1) / _size ) === Math.floor( (nIndex) / _size ) ?
			nIndex + 1 : false;
		}

		function getDownIndex( nIndex )
		{
			return (nIndex + _size) < _size * _size ? nIndex + _size : false;
		}

		function getLeftIndex( nIndex )
		{
			return Math.floor( (nIndex - 1) / _size ) === Math.floor( (nIndex) / _size ) ?
			nIndex - 1 : false;
		}
	}
};

(function()
{
	var drawer = new miner.drawer( "canvas", 20 );
	document.getElementById( "cellStateSelect" ).addEventListener( 'change', function()
	{
		drawer.changeNewCellState( document.getElementById( "cellStateSelect" ).value );
	} );
	document.getElementById( "speedUpButton" ).addEventListener( 'click', function()
	{
		drawer.changeSpeed( -50 );
	} );
	document.getElementById( "speedDownButton" ).addEventListener( 'click', function()
	{
		drawer.changeSpeed( 50 );
	} );
	document.getElementById( "actorUpButton" ).addEventListener( 'click', function()
	{
		drawer.changeCurrentActor( 1 );
	} );
	document.getElementById( "actorDownButton" ).addEventListener( 'click', function()
	{
		drawer.changeCurrentActor( -1 );
	} );
	document.getElementById( "showCopyrightsButton" ).addEventListener( 'click', function()
	{
		document.getElementById( 'canvas' ).style.display     = 'none';
		document.getElementById( 'interface' ).style.display  = 'none';
		document.getElementById( 'copyrights' ).style.display = 'block';
	} );
	document.getElementById( 'back' ).addEventListener( 'click', function()
	{
		document.getElementById( 'copyrights' ).style.display = 'none';
		document.getElementById( 'canvas' ).style.display     = 'inline';
		document.getElementById( 'interface' ).style.display  = 'block';
	} )
})();
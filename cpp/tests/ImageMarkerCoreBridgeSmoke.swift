let landscape = IMImageMarkerFitWithinMax(4000, 2000, 1000)
precondition(landscape.width == 1000)
precondition(landscape.height == 500)

let narrow = IMImageMarkerFitWithinMax(1000, 1, 10)
precondition(narrow.width == 10)
precondition(narrow.height == 1)

# Mega Man Advancet PET #
This is a JSON database and frontend for the Advanced PET.

Chips contain the following important information:  
* Stuff shown on face:
    - Number
    - Type
        + Attack: _BATTLE CHIP_ is yellow
        + Ability: _BATTLE CHIP_ is blue
        + Navi: Says _NAVI CHIP_ across the top
    - Class
        + Standard: Gray border
        + Mega: Blue border
        + Giga: Red border
    - Element
        + ![Neutral](http://logicplace.com/tools/pet/advanced/images/element-neutral.jpg "Neutral")
        ![Aqua](http://logicplace.com/tools/pet/advanced/images/element-aqua.jpg "Aqua")
        ![Fire](http://logicplace.com/tools/pet/advanced/images/element-fire.jpg "Fire")
        ![Wood](http://logicplace.com/tools/pet/advanced/images/element-wood.jpg "Wood")
        ![Elec](http://logicplace.com/tools/pet/advanced/images/element-elec.jpg "Electric")
    - Name (by region)
        + Japanese
        + Korean?
        + English
        + **CP X**
        + (blank)
* Stats in game:
    - CP - Cost
    - AT - Attack power
    - Element - Probably the same as on the face
        + ![Neutral](http://logicplace.com/tools/pet/advanced/images/element-neutral.gif "Neutral")
        ![Aqua](http://logicplace.com/tools/pet/advanced/images/element-aqua.gif "Aqua")
        ![Fire](http://logicplace.com/tools/pet/advanced/images/element-fire.gif "Fire")
        ![Wood](http://logicplace.com/tools/pet/advanced/images/element-wood.gif "Wood")
        ![Elec](http://logicplace.com/tools/pet/advanced/images/element-elec.gif "Electric")
    - One of:
        + Field - Attack chips have this
            * Target start position & shape
            * Un/selectable tiles - can only be observed in use
        + Effect - Ability chips have this
            * Effect text
            * Effect semantics - can only be observed in use
* Internally/Other:
    - Pin arrangement
    - Places/sets from which it's obtained (by region)

Navi chips don't seem to be usable on mine; they may only work on the Advanced PET 2, maybe the Progress PET?

# Contributing #
After adding new data run `../infomgr.py -u updated.json 're:chips/.*\.json'`

# viewer-sync
Simple repo to compare two designs side by side with proper sync

## Introduction
This sample demonstrates a way to syncronize two Viewers rendering the same project, but originated from diferent sources. It can be useful for a side by side comparision between a nwd, rvt, 3ds max design or a mesh, for instance.

## Premises
As our base assumption for this sample, we're going to assume that the models are compatible, i.e they refer to the same scene, differing in scale and/or rotation.

Our challenge will be on finding a way to syncronize the camera between the compatible scenes. Lets suppose we have two scenes rendering a table: If the tables are compatible, they both share the same proportions (length, width and heigth) in a way that we can define an equivalence of coordinates from them.

## How to find the equivalence?
When we move from one scene to the other, there are a few transformations that we need to consider.

First of them is rotation, as the tables can be misaligned:

![rotation difference](./assets/tables_rotation.gif)

The other transformation that we need to consider is regarding scale:

![scale difference](./assets/tables_scale.gif)

Lastly, we also need to consider the different origins for the coordinates systems of those scenes.

With a combination of all these conversions (rotation, scale and translation) we can syncronize the two scenes.

## The math behind the sync
Before jumping into the math for our calculations, lets begin with some contextuakization.

Both scenes represent each a three dimensional space, with its own coordinate system.

![coordinate systems]()
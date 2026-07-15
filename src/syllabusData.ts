export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  notes: string[];
  pyqs: { question: string; answer: string; year: string }[];
  practiceQuestions: string[];
}

export interface SubjectSyllabus {
  subject: string;
  description: string;
  chapters: Chapter[];
}

export interface ClassSyllabus {
  grade: string; // "Class 9" | "Class 10" | "Class 11" | "Class 12"
  streams: string[]; // e.g. ["PCM", "PCB", "Arts", "Commerce"]
  subjects: SubjectSyllabus[];
}

export const SYLLABUS_DB: ClassSyllabus[] = [
  {
    grade: "Class 9",
    streams: ["General"],
    subjects: [
      {
        subject: "Mathematics",
        description: "Foundational algebra, geometry, coordinate geometry, probability, and mensuration.",
        chapters: [
          { id: "c9-m-1", number: 1, title: "Number Systems", summary: "Rational and irrational numbers, real numbers, and decimal representations.", notes: ["Rational numbers can be expressed as p/q.", "Irrational numbers cannot be represented as p/q (e.g. √2).", "Rationalize denominators by multiplying conjugates."], pyqs: [{ question: "Find five rational numbers between 3/5 and 4/5.", answer: "Multiply by 6/6: 18/30 and 24/30. Rational numbers: 19/30, 20/30, 21/30, 22/30, 23/30.", year: "2023" }], practiceQuestions: ["Simplify: (3 + √3)(2 + √2).", "Express 0.666... in p/q form."] },
          { id: "c9-m-2", number: 2, title: "Polynomials", summary: "Algebraic expressions, zeros, Remainder Theorem, and Factor Theorem.", notes: ["Zero of a polynomial is the value of x where p(x) = 0.", "Remainder Theorem: If p(x) is divided by (x-a), the remainder is p(a)."], pyqs: [{ question: "Factorize: 12x² - 7x + 1", answer: "(3x - 1)(4x - 1)", year: "2024" }], practiceQuestions: ["Find k if x-1 is a factor of 4x³ + 3x² - 4x + k."] },
          { id: "c9-m-3", number: 3, title: "Coordinate Geometry", summary: "Cartesian plane, x and y coordinates, and plotting points.", notes: ["The horizontal line is the x-axis, and vertical line is the y-axis.", "The point of intersection is the origin (0,0)."], pyqs: [], practiceQuestions: ["In which quadrant do the points (-2, 4) and (3, -1) lie?"] },
          { id: "c9-m-4", number: 4, title: "Linear Equations in Two Variables", summary: "Equations in form ax + by + c = 0 and their graphical representation.", notes: ["A linear equation in two variables has infinitely many solutions.", "The graph of ax + by + c = 0 is a straight line."], pyqs: [], practiceQuestions: ["Find four different solutions of 2x + y = 6."] },
          { id: "c9-m-5", number: 5, title: "Introduction to Euclid's Geometry", summary: "Euclid's axioms and postulates and their applications.", notes: ["Axioms are assumptions used throughout mathematics.", "Postulates are assumptions specific to geometry."], pyqs: [], practiceQuestions: ["State Euclid's five postulates."] },
          { id: "c9-m-6", number: 6, title: "Lines and Angles", summary: "Intersecting lines, parallel lines, interior, and exterior angles.", notes: ["If a ray stands on a line, the sum of two adjacent angles is 180°.", "If two lines intersect, vertically opposite angles are equal."], pyqs: [], practiceQuestions: ["Prove that the sum of angles of a triangle is 180°."] },
          { id: "c9-m-7", number: 7, title: "Triangles", summary: "Congruence of triangles, rules of congruence (SAS, ASA, SSS).", notes: ["Two triangles are congruent if their corresponding sides and angles are equal.", "Angle sum property and inequalities in a triangle."], pyqs: [], practiceQuestions: ["State and prove RHS congruence rule."] },
          { id: "c9-m-8", number: 8, title: "Quadrilaterals", summary: "Properties of parallelogram, rectangle, rhombus, and square.", notes: ["A quadrilateral is a parallelogram if its opposite sides are equal.", "The diagonals of a rectangle bisect each other and are equal."], pyqs: [], practiceQuestions: ["Prove that a diagonal of a parallelogram divides it into two congruent triangles."] },
          { id: "c9-m-9", number: 9, title: "Circles", summary: "Chords, angles subtended by chord, cyclic quadrilaterals.", notes: ["Equal chords of a circle subtend equal angles at the center.", "The opposite angles of a cyclic quadrilateral sum to 180°."], pyqs: [], practiceQuestions: ["Prove that the angle subtended by an arc at the center is double the angle subtended by it at any point on the remaining part of the circle."] },
          { id: "c9-m-10", number: 10, title: "Heron's Formula", summary: "Area of triangle using Heron's formula without height.", notes: ["Area = √(s(s-a)(s-b)(s-c)) where s = (a+b+c)/2."], pyqs: [], practiceQuestions: ["Find the area of a triangle with sides 8cm, 11cm and perimeter 32cm."] },
          { id: "c9-m-11", number: 11, title: "Surface Areas and Volumes", summary: "Calculation of surface areas and volumes of cube, cuboid, cylinder, cone, sphere.", notes: ["Volume of a cone = 1/3 * πr²h.", "Surface area of sphere = 4πr²."], pyqs: [], practiceQuestions: ["Calculate the volume of a sphere of radius 7cm."] },
          { id: "c9-m-12", number: 12, title: "Statistics", summary: "Collection of data, frequency tables, bar graphs, histograms.", notes: ["Data can be represented graphically using bar graphs, histograms, and frequency polygons."], pyqs: [], practiceQuestions: ["Construct a frequency table for the marks obtained by 30 students."] }
        ]
      },
      {
        subject: "Physics",
        description: "Study of motion, forces, laws of gravitation, work, energy, and sound.",
        chapters: [
          { id: "c9-p-1", number: 1, title: "Motion", summary: "Distance, displacement, velocity, acceleration, and equations of motion.", notes: ["Acceleration = (v-u)/t.", "Equations of motion: v=u+at, s=ut+1/2at², v²-u²=2as."], pyqs: [{ question: "Derive equations of motion graphically.", answer: "Explain the velocity-time graph derivation steps.", year: "2023" }], practiceQuestions: ["Distinguish between distance and displacement.", "A car accelerates from 18km/h to 36km/h in 5s. Find acceleration."] },
          { id: "c9-p-2", number: 2, title: "Force and Laws of Motion", summary: "Inertia, momentum, Newton's three laws of motion.", notes: ["Inertia is the natural tendency to resist a change in state of motion.", "Force F = ma.", "Action and reaction are equal and opposite."], pyqs: [], practiceQuestions: ["Why does a passenger fall forward when a bus stops suddenly?", "State the law of conservation of momentum."] },
          { id: "c9-p-3", number: 3, title: "Gravitation", summary: "Universal law of gravitation, free fall, acceleration due to gravity (g).", notes: ["Universal Gravitational force F = G * m1 * m2 / d².", "Value of g = 9.8 m/s² on Earth's surface."], pyqs: [], practiceQuestions: ["State Archimedes' principle.", "What is the difference between mass and weight?"] },
          { id: "c9-p-4", number: 4, title: "Work and Energy", summary: "Kinetic energy, potential energy, and law of conservation of energy.", notes: ["Work = Force * displacement.", "Kinetic Energy = 1/2 mv².", "Potential Energy = mgh."], pyqs: [], practiceQuestions: ["State the law of conservation of energy.", "An object of mass 15kg is moving with uniform velocity of 4 m/s. Find kinetic energy."] },
          { id: "c9-p-5", number: 5, title: "Sound", summary: "Propagation of sound, longitudinal waves, echo, ultrasound.", notes: ["Sound requires a material medium to propagate.", "Echo requires a minimum distance of 17.2m to be heard."], pyqs: [], practiceQuestions: ["What is ultrasound? State two applications.", "Explain working of SONAR."] }
        ]
      },
      {
        subject: "Chemistry",
        description: "Matter in our surroundings, purity, atoms, molecules, and chemical structure.",
        chapters: [
          { id: "c9-c-1", number: 1, title: "Matter in Our Surroundings", summary: "Physical state of matter, change of states, sublimation, evaporation.", notes: ["Matter consists of tiny particles that attract each other.", "Sublimation: Solid to Gas transition directly.", "Evaporation causes a cooling effect."], pyqs: [{ question: "Why does water kept in earthen pots cool better?", answer: "Earthen pots have pores that increase evaporation, absorbing heat from water.", year: "2022" }], practiceQuestions: ["Convert 373°C to Kelvin.", "Explain latent heat of vaporization."] },
          { id: "c9-c-2", number: 2, title: "Is Matter Around Us Pure", summary: "Mixtures, solutions, colloids, suspensions, physical & chemical changes.", notes: ["A pure substance consists of single type of particles.", "Colloids show Tyndall effect."], pyqs: [], practiceQuestions: ["Distinguish between a true solution, suspension and colloid.", "What is chromatography?"] },
          { id: "c9-c-3", number: 3, title: "Atoms and Molecules", summary: "Laws of chemical combination, Dalton's atomic theory, mole concept.", notes: ["Law of conservation of mass: Mass can neither be created nor destroyed.", "A mole contains 6.022 x 10²³ particles (Avogadro number)."], pyqs: [], practiceQuestions: ["Calculate the molecular mass of HNO3.", "How many moles are in 12g of Oxygen gas?"] },
          { id: "c9-c-4", number: 4, title: "Structure of the Atom", summary: "Thomson, Rutherford, and Bohr models, isotopes, and isobars.", notes: ["Rutherford's gold foil experiment discovered atomic nucleus.", "Valency is the combining capacity of an atom."], pyqs: [], practiceQuestions: ["Describe Bohr's model of an atom.", "Define isotopes with two examples."] }
        ]
      },
      {
        subject: "Biology",
        description: "The fundamental unit of life, cell structure, tissues, and resources.",
        chapters: [
          { id: "c9-b-1", number: 1, title: "The Fundamental Unit of Life", summary: "Cell structure, plasma membrane, nucleus, cytoplasm, and cell organelles.", notes: ["Cell is the basic structural and functional unit of life.", "Mitochondria is the powerhouse of the cell.", "Lysosomes are suicide bags."], pyqs: [], practiceQuestions: ["Draw and label a plant cell.", "What is osmosis?"] },
          { id: "c9-b-2", number: 2, title: "Tissues", summary: "Meristematic, permanent plant tissues, animal epithelial, muscular, nervous tissues.", notes: ["Group of cells performing similar functions is a tissue.", "Xylem and phloem are complex permanent tissues."], pyqs: [], practiceQuestions: ["Differentiate between bone and cartilage.", "What are the functions of stomata?"] },
          { id: "c9-b-3", number: 3, title: "Improvement in Food Resources", summary: "Crop yield management, fertilizers, animal husbandry.", notes: ["Crop rotation and organic farming improve soil health.", "Apiculture is bee-keeping for honey production."], pyqs: [], practiceQuestions: ["What are macronutrients? Why are they called so?", "What is mixed cropping?"] }
        ]
      },
      {
        subject: "History",
        description: "The French Revolution, socialism, rise of Hitler, and social impacts.",
        chapters: [
          { id: "c9-h-1", number: 1, title: "The French Revolution", summary: "Causes, fall of Bastille, reign of terror, and rise of Napoleon.", notes: ["The revolution started in 1789.", "Society was divided into three Estates.", "The ideas of Liberty, Equality, Fraternity emerged."], pyqs: [], practiceQuestions: ["What were the primary social causes of the French Revolution?", "Describe the Reign of Terror."] },
          { id: "c9-h-2", number: 2, title: "Socialism in Europe & Russian Revolution", summary: "Rise of industrialization, Bolsheviks, and the October Revolution.", notes: ["Liberals, Radicals, and Conservatives had differing ideologies.", "Lenin led the Bolshevik party to establish soviet rule in 1917."], pyqs: [], practiceQuestions: ["Explain the global impact of the Russian Revolution.", "What was collectivization?"] },
          { id: "c9-h-3", number: 3, title: "Nazism and the Rise of Hitler", summary: "Weimar Republic, Nazi ideology, propaganda, and World War II.", notes: ["Germany suffered heavily after the Treaty of Versailles.", "Hitler established total dictatorship in 1933."], pyqs: [], practiceQuestions: ["Explain Nazi ideology regarding race.", "What were the major challenges faced by Weimar Republic?"] }
        ]
      },
      {
        subject: "Geography",
        description: "India's location, size, physical features, climate, and drainage.",
        chapters: [
          { id: "c9-g-1", number: 1, title: "India - Size and Location", summary: "Latitudes, longitudes, time zones, and India's global neighbors.", notes: ["India lies entirely in the Northern Hemisphere.", "Standard Meridian of India is 82°30'E passing through Mirzapur."], pyqs: [], practiceQuestions: ["Why is 82°30'E chosen as the Standard Meridian of India?"] },
          { id: "c9-g-2", number: 2, title: "Physical Features of India", summary: "Himalayas, Northern Plains, Peninsular Plateau, deserts, islands.", notes: ["The Himalayas are young fold mountains.", "The Deccan Plateau is composed of black soil volcanic rocks."], pyqs: [], practiceQuestions: ["Differentiate between Western Ghats and Eastern Ghats."] },
          { id: "c9-g-3", number: 3, title: "Drainage", summary: "Himalayan rivers, peninsular rivers, lakes, and river pollution.", notes: ["Himalayan rivers are perennial (e.g. Ganga, Indus).", "Peninsular rivers are seasonal (e.g. Godavari)."], pyqs: [], practiceQuestions: ["Compare the features of Himalayan and Peninsular rivers."] },
          { id: "c9-g-4", number: 4, title: "Climate", summary: "Monsoon patterns, cold and hot weather seasons, distribution of rainfall.", notes: ["India's climate is of Monsoon type.", "El Niño affects monsoon wind cycles in India."], pyqs: [], practiceQuestions: ["What are the factors affecting the climate of India?"] }
        ]
      },
      {
        subject: "Political Science",
        description: "Democracy, constitutional structures, elections, and civic duties.",
        chapters: [
          { id: "c9-ps-1", number: 1, title: "What is Democracy? Why Democracy?", summary: "Core values, features of democratic governments, and limitations.", notes: ["Democracy is a form of government where rulers are elected by people.", "Ensures major decisions are made by elected representatives."], pyqs: [], practiceQuestions: ["State the major arguments against democracy."] },
          { id: "c9-ps-2", number: 2, title: "Constitutional Design", summary: "South African struggle, role of constituent assembly, preamble values.", notes: ["Indian constitution was adopted on 26th November 1949.", "Dr. B.R. Ambedkar was Chairman of Drafting Committee."], pyqs: [], practiceQuestions: ["Why do we need a Constitution? Explain."] }
        ]
      },
      {
        subject: "Economics",
        description: "Farming, human capital, poverty challenges, and food security.",
        chapters: [
          { id: "c9-e-1", number: 1, title: "The Story of Village Palampur", summary: "Farming and non-farming activities, land reforms, labor constraints.", notes: ["Farming is the main production activity in Palampur.", "Capital and physical resources play crucial roles in crop returns."], pyqs: [], practiceQuestions: ["Differentiate between multiple cropping and modern farming methods."] },
          { id: "c9-e-2", number: 2, title: "People as Resource", summary: "Education, healthcare, economic activities, and unemployment.", notes: ["Human capital is superior to physical and land resources.", "Unemployment can be seasonal or disguised in rural areas."], pyqs: [], practiceQuestions: ["Explain disguised unemployment with an example."] }
        ]
      },
      {
        subject: "English Literature",
        description: "Poetry, stories, and communication skills of Class 9 CBSE.",
        chapters: [
          { id: "c9-en-1", number: 1, title: "The Fun They Had", summary: "Future schools with robotic teachers vs. older human-led classrooms.", notes: ["Written by Isaac Asimov.", "Explores themes of digital isolation in electronic schooling."], pyqs: [], practiceQuestions: ["How does Tommy describe the old kind of school?"] },
          { id: "c9-en-2", number: 2, title: "The Sound of Music", summary: "The musical journey of Evelyn Glennie and Bismillah Khan.", notes: ["Evelyn learned to hear music through her body instead of ears."], pyqs: [], practiceQuestions: ["How did Evelyn Glennie discover her deep connection to percussion?"] }
        ]
      },
      {
        subject: "Hindi Grammar",
        description: "CBSE Class 9 Hindi Sanchayan and general grammar blocks.",
        chapters: [
          { id: "c9-hi-1", number: 1, title: "दो बैलों की कथा", summary: "प्रेमचंद की प्रसिद्ध कहानी - हीरा और मोती की मित्रता और स्वतंत्रता संघर्ष।", notes: ["हीरा और मोती स्वाभिमान और आपसी प्रेम के प्रतीक हैं।"], pyqs: [], practiceQuestions: ["कांजीहौस में कैद पशुओं की हाजिरी क्यों ली जाती होगी?"] }
        ]
      },
      {
        subject: "Computer Science",
        description: "Information technology foundations, hardware, software, and cybersecurity.",
        chapters: [
          { id: "c9-cs-1", number: 1, title: "Basics of IT", summary: "Computer components, RAM/ROM, input/output structures.", notes: ["CPU consists of ALU and CU.", "Operating system acts as hardware interface."], pyqs: [], practiceQuestions: ["Differentiate between RAM and ROM."] }
        ]
      }
    ]
  },
  {
    grade: "Class 10",
    streams: ["General"],
    subjects: [
      {
        subject: "Mathematics",
        description: "Trigonometry, quadratic equations, arithmetic progressions, probability, and coordinate geometry.",
        chapters: [
          { id: "c10-m-1", number: 1, title: "Real Numbers", summary: "Fundamental Theorem of Arithmetic, irrationality proofs, and decimal representations.", notes: ["Every composite number can be factored uniquely into primes.", "HCF(a,b) * LCM(a,b) = a * b."], pyqs: [{ question: "Prove that √5 is irrational.", answer: "Use proof by contradiction. Assume √5 = a/b where a & b are co-prime integers.", year: "2023" }], practiceQuestions: ["Find HCF of 96 and 404 by prime factorization."] },
          { id: "c10-m-2", number: 2, title: "Polynomials", summary: "Geometrical meaning of zeros, relationship between zeros and coefficients.", notes: ["Sum of zeros α + β = -b/a.", "Product of zeros αβ = c/a."], pyqs: [], practiceQuestions: ["Find a quadratic polynomial whose sum and product of zeros are -3 and 2."] },
          { id: "c10-m-3", number: 3, title: "Pair of Linear Equations in Two Variables", summary: "Graphical and algebraic methods, elimination, substitution.", notes: ["Intersecting lines have unique solution.", "Coincident lines have infinite solutions.", "Parallel lines have no solution."], pyqs: [], practiceQuestions: ["Solve: 2x + 3y = 11 and 2x - 4y = -24."] },
          { id: "c10-m-4", number: 4, title: "Quadratic Equations", summary: "Standard form ax² + bx + c = 0, factorization, and quadratic formula.", notes: ["Discriminant D = b² - 4ac.", "If D > 0 roots are real and distinct; D = 0 roots are real and equal."], pyqs: [{ question: "Solve: 2x² - 5x + 3 = 0", answer: "Using formula: x = (5 ± √1)/4 => x = 1.5 or x = 1.", year: "2024" }], practiceQuestions: ["Find k if the equation 2x² + kx + 3 = 0 has equal roots."] },
          { id: "c10-m-5", number: 5, title: "Arithmetic Progressions", summary: "nth term of AP, sum of first n terms of AP.", notes: ["an = a + (n-1)d.", "Sn = n/2 * [2a + (n-1)d]."], pyqs: [], practiceQuestions: ["Find the 30th term of the AP: 10, 7, 4, ..."] },
          { id: "c10-m-6", number: 6, title: "Introduction to Trigonometry", summary: "Trigonometric ratios of acute angles, identities (sin²θ + cos²θ = 1).", notes: ["sin θ = opposite/hypotenuse, cos θ = adjacent/hypotenuse.", "tan θ = sin θ/cos θ."], pyqs: [{ question: "Evaluate: sin 60° cos 30° + sin 30° cos 60°", answer: "√(3)/2 * √(3)/2 + 1/2 * 1/2 = 3/4 + 1/4 = 1", year: "2023" }], practiceQuestions: ["If sin A = 3/4, calculate cos A and tan A."] },
          { id: "c10-m-7", number: 7, title: "Circles", summary: "Tangent to a circle, number of tangents from a point.", notes: ["The tangent is perpendicular to the radius at point of contact.", "Tangents from an external point to a circle are equal in length."], pyqs: [], practiceQuestions: ["Prove that tangents drawn from an external point to a circle subtend equal angles at the center."] },
          { id: "c10-m-8", number: 8, title: "Probability", summary: "Theoretical probability, outcomes, events, cards and coins.", notes: ["P(E) = number of favorable outcomes / total outcomes.", "0 ≤ P(E) ≤ 1."], pyqs: [], practiceQuestions: ["A card is drawn from a well-shuffled deck of 52 cards. Find the probability of getting a king of red color."] }
        ]
      },
      {
        subject: "Physics",
        description: "Light reflection & refraction, human eye, electricity, and magnetic effects.",
        chapters: [
          { id: "c10-p-1", number: 1, title: "Light - Reflection and Refraction", summary: "Spherical mirrors, mirror formula, refractive index, lens formula, magnification.", notes: ["Mirror Formula: 1/f = 1/v + 1/u.", "Lens Formula: 1/f = 1/v - 1/u.", "Power of Lens P = 1/f (in meters)."], pyqs: [{ question: "A concave mirror has focal length 15cm. Find image of object placed at 10cm.", answer: "u = -10, f = -15. 1/v = 1/f - 1/u = 1/30 => v = 30cm (Virtual & behind mirror).", year: "2023" }], practiceQuestions: ["Define power of lens. State SI unit.", "Explain total internal reflection."] },
          { id: "c10-p-2", number: 2, title: "Human Eye and Colorful World", summary: "Defects of vision (myopia, hypermetropia), glass prism dispersion, atmospheric refraction.", notes: ["Myopia is corrected by concave lens.", "Hypermetropia is corrected by convex lens.", "Rainbow is formed due to dispersion, refraction, and internal reflection."], pyqs: [], practiceQuestions: ["Why does the sun appear reddish early in the morning?", "Explain the scattering of light."] },
          { id: "c10-p-3", number: 3, title: "Electricity", summary: "Ohm's law, resistance, series and parallel circuits, heating effect of current.", notes: ["Ohm's Law: V = IR.", "Equivalent resistance in series: Rs = R1+R2+R3.", "Equivalent resistance in parallel: 1/Rp = 1/R1 + 1/R2 + 1/R3."], pyqs: [], practiceQuestions: ["State Joule's law of heating.", "How much work is done in moving a charge of 2C across two points having a potential difference 12V?"] },
          { id: "c10-p-4", number: 4, title: "Magnetic Effects of Electric Current", summary: "Magnetic field lines, electromagnetism, electromagnetic induction, Fleming's rules.", notes: ["Right-hand thumb rule gives direction of magnetic field lines.", "Fleming's left-hand rule is used for electric motors."], pyqs: [], practiceQuestions: ["Differentiate between AC and DC current.", "Explain the function of earth wire in domestic circuits."] }
        ]
      },
      {
        subject: "Chemistry",
        description: "Chemical equations, acids & bases, metals, carbon structure, periodic trends.",
        chapters: [
          { id: "c10-c-1", number: 1, title: "Chemical Reactions and Equations", summary: "Types of reactions (combination, decomposition, redox), balancing equations, corrosion.", notes: ["Chemical equation represents reacting species and products.", "Corrosion is the oxidation damage to metals like rusting of iron."], pyqs: [{ question: "Balance: Fe + H2O -> Fe3O4 + H2", answer: "3Fe + 4H2O -> Fe3O4 + 4H2", year: "2022" }], practiceQuestions: ["Differentiate between exothermic and endothermic reactions.", "Why should a magnesium ribbon be cleaned before burning in air?"] },
          { id: "c10-c-2", number: 2, title: "Acids, Bases and Salts", summary: "pH scale, properties of HCl, NaOH, bleaching powder, baking soda, plaster of Paris.", notes: ["Acids turn blue litmus red; pH < 7.", "Bases turn red litmus blue; pH > 7.", "Plaster of Paris (CaSO4·1/2H2O) sets into gypsum on mixing water."], pyqs: [], practiceQuestions: ["What is neutralization reaction? Give one example.", "Explain Chlor-alkali process."] },
          { id: "c10-c-3", number: 3, title: "Metals and Non-Metals", summary: "Properties of metals, reactivity series, extraction of metals, alloy formation.", notes: ["Metals are electropositive, forming basic oxides.", "Aqua regia is a 3:1 mixture of concentrated HCl and HNO3."], pyqs: [], practiceQuestions: ["Define metallurgy. Explain calcination and roasting.", "Why is sodium stored in kerosene?"] },
          { id: "c10-c-4", number: 4, title: "Carbon and its Compounds", summary: "Covalent bonding, versatile nature of carbon, homologous series, functional groups.", notes: ["Carbon forms covalent bonds due to tetravalency and catenation.", "Saturated hydrocarbons have single bonds, unsaturated have double or triple bonds."], pyqs: [], practiceQuestions: ["What is homologous series? State its properties.", "Explain saponification with chemical equation."] }
        ]
      },
      {
        subject: "Biology",
        description: "Life processes, control & coordination, reproduction, genetics and heredity.",
        chapters: [
          { id: "c10-b-1", number: 1, title: "Life Processes", summary: "Nutrition (photosynthesis), respiration, transportation (human heart), excretion.", notes: ["Autotrophic nutrition involves chlorophyll and sunlight.", "Double circulation in humans separates oxygenated and deoxygenated blood."], pyqs: [{ question: "Draw a neat labeled diagram of human nephron.", answer: "Details of glomerulus, Bowman's capsule and tubular filtration.", year: "2024" }], practiceQuestions: ["Describe the process of double circulation in human beings.", "Compare aerobic and anaerobic respiration."] },
          { id: "c10-b-2", number: 2, title: "Control and Coordination", summary: "Human brain, nervous coordination, reflex actions, plant hormones.", notes: ["Synapse is the junction between two neurons.", "Plant hormones include Auxins, Gibberellins, Cytokinins, Abscisic acid."], pyqs: [], practiceQuestions: ["What is reflex action? Draw the reflex arc.", "Mention the functions of thyroid gland."] },
          { id: "c10-b-3", number: 3, title: "How do Organisms Reproduce?", summary: "Fission, budding, vegetative propagation, human reproductive systems, contraception.", notes: ["Asexual reproduction involves single parent.", "Pollination is transfer of pollen from anther to stigma."], pyqs: [], practiceQuestions: ["Explain the structure of a flower with labeled diagram.", "Explain various contraceptive methods."] },
          { id: "c10-b-4", number: 4, title: "Heredity and Evolution", summary: "Mendel's experiments, monohybrid and dihybrid cross, sex determination.", notes: ["Mendel is the father of genetics.", "Sex determination in humans is XY system (determined by father's sperm)."], pyqs: [], practiceQuestions: ["Explain Mendel's law of segregation.", "How is the sex of a child determined in human beings?"] }
        ]
      },
      {
        subject: "History",
        description: "Nationalism in Europe, unification of Germany & Italy, nationalism in India.",
        chapters: [
          { id: "c10-h-1", number: 1, title: "The Rise of Nationalism in Europe", summary: "French revolution ideas, unification of Italy and Germany.", notes: ["Otto von Bismarck unified Germany using blood & iron.", "Giuseppe Garibaldi led Red Shirts for Italian unification."], pyqs: [], practiceQuestions: ["What was the Civil Code of 1804 (Napoleonic Code)?", "Describe the process of German Unification."] },
          { id: "c10-h-2", number: 2, title: "Nationalism in India", summary: "Non-Cooperation, Civil Disobedience, Rowlatt Act, Salt March.", notes: ["Mahatma Gandhi returned to India in 1915.", "Salt March started on 12th March 1930 from Sabarmati."], pyqs: [], practiceQuestions: ["Why did Gandhiji decide to withdraw the Non-Cooperation Movement?", "Explain the significance of the Dandi March."] }
        ]
      },
      {
        subject: "Geography",
        description: "Resources, forests, soils, agriculture, mineral & energy systems.",
        chapters: [
          { id: "c10-g-1", number: 1, title: "Resources and Development", summary: "Classification of resources, sustainable development, soil erosion and conservation.", notes: ["Soil types: alluvial, black, red, yellow, laterite, arid.", "Black soil is also called Regur soil."], pyqs: [], practiceQuestions: ["Explain the concept of sustainable development.", "Differentiate between Bangar and Khadar soils."] }
        ]
      },
      {
        subject: "Political Science",
        description: "Power sharing models, federal systems, political parties, and democracy.",
        chapters: [
          { id: "c10-ps-1", number: 1, title: "Power Sharing", summary: "Belgian model vs Sri Lankan majoritarianism, need for power sharing.", notes: ["Belgian constitution amended four times to accommodate diversity.", "Sri Lanka declared Sinhala only in 1956 act."], pyqs: [], practiceQuestions: ["Why is power sharing desirable? Give prudential and moral reasons."] },
          { id: "c10-ps-2", number: 2, title: "Federalism", summary: "Decentralization in India, union, state, and concurrent lists.", notes: ["Federalism divides power between central authority and constituent units.", "73rd/74th amendments strengthened rural/urban local government."], pyqs: [], practiceQuestions: ["What are the key features of federalism?"] }
        ]
      },
      {
        subject: "Economics",
        description: "Development markers, banking, globalization, consumer rights.",
        chapters: [
          { id: "c10-e-1", number: 1, title: "Development", summary: "PCI, HDI, life expectancy, infant mortality rate.", notes: ["Development has different goals for different people.", "World Bank uses per capita income to classify countries."], pyqs: [], practiceQuestions: ["Why is human development index a better indicator than GDP?"] },
          { id: "c10-e-2", number: 2, title: "Sectors of the Indian Economy", summary: "Primary, secondary, tertiary sectors, organized and unorganized.", notes: ["Tertiary sector is services. Primary sector is agriculture.", "GDP calculation includes only final goods and services."], pyqs: [], practiceQuestions: ["Differentiate between organized and unorganized sectors."] }
        ]
      },
      {
        subject: "English Literature",
        description: "Prose, poetry, and narrative writing for Class 10 CBSE.",
        chapters: [
          { id: "c10-en-1", number: 1, title: "A Letter to God", summary: "Lencho's absolute faith in God, crop damage by hailstorm, postmaster's help.", notes: ["Written by G.L. Fuentes.", "Explores human greed vs pure innocent faith."], pyqs: [], practiceQuestions: ["Why did Lencho write a letter to God? How did the postmaster react?"] }
        ]
      },
      {
        subject: "Hindi Grammar",
        description: "Syllabus grammar blocks for Class 10 Board preparation.",
        chapters: [
          { id: "c10-hi-1", number: 1, title: "दशानन और समास", summary: "समास के भेद, उदाहरण और वाक्य विग्रह सहित बोर्ड परीक्षा तैयारी।", notes: ["दशानन = दस हैं आनन जिसके (रावण) - बहुव्रीहि समास।"], pyqs: [], practiceQuestions: ["समास किसे कहते हैं? द्विगु और द्वंद्व समास में क्या अंतर है?"] }
        ]
      },
      {
        subject: "Computer Science",
        description: "Internet foundations, HTML web development, and cyber laws.",
        chapters: [
          { id: "c10-cs-1", number: 1, title: "HTML Basics", summary: "Creating basic pages using tags like paragraphs, headings, breaks.", notes: ["<br> is an empty tag used for line breaks.", "<hr> draws horizontal line."], pyqs: [], practiceQuestions: ["Write an HTML snippet that contains a hyperlinked text and a table."] }
        ]
      }
    ]
  },
  {
    grade: "Class 11",
    streams: ["PCM", "PCB", "Arts", "Commerce"],
    subjects: [
      {
        subject: "Physics",
        description: "Mechanics, heat, thermodynamics, oscillations, waves, and matter properties.",
        chapters: [
          { id: "c11-p-1", number: 1, title: "Laws of Motion", summary: "Force, inertia, Newton's laws, impulse, friction, banking of roads.", notes: ["Newton's second law F = dp/dt.", "Friction force f = μN.", "Banked road speed limit: v = √(μrg)."], pyqs: [{ question: "State and prove law of conservation of momentum.", answer: "If net external force is zero, total linear momentum remains conserved.", year: "2023" }], practiceQuestions: ["Why is a circular road banked at turns?", "Calculate the impulse of a constant force."] },
          { id: "c11-p-2", number: 2, title: "Work, Energy and Power", summary: "Work-energy theorem, conservative & non-conservative forces, collisions.", notes: ["Work-Energy Theorem: Change in KE equals net work done.", "Elastic collision conserves both momentum and kinetic energy."], pyqs: [], practiceQuestions: ["Prove that mechanical energy is conserved during free fall.", "State differences between elastic and inelastic collisions."] },
          { id: "c11-p-3", number: 3, title: "Thermodynamics", summary: "Thermal equilibrium, Zeroth, First, and Second laws of thermodynamics.", notes: ["First Law: dQ = dU + dW.", "Isothermal process temperature is constant; adiabatic process heat exchange is zero."], pyqs: [], practiceQuestions: ["Derive work done in an isothermal expansion.", "Explain Carnot engine cycle."] }
        ]
      },
      {
        subject: "Chemistry",
        description: "Inorganic foundations, physical atomic theories, thermodynamics, organic compounds.",
        chapters: [
          { id: "c11-c-1", number: 1, title: "Structure of Atom", summary: "Bohr's model, quantum numbers, electronic configuration, Heisenberg's uncertainty principle.", notes: ["Planck's equation: E = hν.", "Heisenberg's Uncertainty: Δx * Δp ≥ h / (4π).", "Aufbau principle fills lowest energy levels first."], pyqs: [{ question: "State the rules for electronic configurations.", answer: "Explain Hund's rule, Pauli's exclusion principle and Aufbau order.", year: "2022" }], practiceQuestions: ["Write configuration for Cr (Z=24) and Cu (Z=29).", "Explain photoelectric effect."] },
          { id: "c11-c-2", number: 2, title: "Chemical Bonding & Structure", summary: "Valence bond theory, hybridization (sp, sp2, sp3), VSEPR theory, molecular orbitals.", notes: ["Hybridization is intermixing of atomic orbitals of slightly different energies.", "Water molecule is bent shape due to lone pairs."], pyqs: [], practiceQuestions: ["Draw the molecular orbital diagram of Oxygen and calculate its bond order."] }
        ]
      },
      {
        subject: "Mathematics",
        description: "Sets, relations, trigonometric functions, limits, statistics.",
        chapters: [
          { id: "c11-m-1", number: 1, title: "Sets and Relations", summary: "Subsets, union, intersection, Cartesian product of sets.", notes: ["Power set contains 2^n elements.", "A × B is the set of all ordered pairs (a, b) where a ∈ A, b ∈ B."], pyqs: [], practiceQuestions: ["If A and B are two sets such that n(A) = 17, n(B) = 23 and n(A∪B) = 38, find n(A∩B)."] },
          { id: "c11-m-2", number: 2, title: "Trigonometric Functions", summary: "Angles, trigonometric equations, identities of double & triple angles.", notes: ["sin(A+B) = sinA cosB + cosA sinB.", "General solution for sin θ = sin α is θ = nπ + (-1)^n α."], pyqs: [], practiceQuestions: ["Prove that: cos 4x = 1 - 8 sin²x cos²x."] }
        ]
      },
      {
        subject: "Biology",
        description: "Living world, plant kingdoms, cells, and human physiology.",
        chapters: [
          { id: "c11-b-1", number: 1, title: "The Living World", summary: "Characteristics of living organisms, taxonomic hierarchy, binomial nomenclature.", notes: ["Linnaeus introduced scientific naming: Genus and Species.", "Hierarchy: Kingdom, Phylum, Class, Order, Family, Genus, Species."], pyqs: [], practiceQuestions: ["Explain binomial nomenclature rules."] },
          { id: "c11-b-2", number: 2, title: "Cell: The Unit of Life", summary: "Prokaryotic and eukaryotic cells, cell wall, nucleus, endomembrane system.", notes: ["Ribosomes are sites of protein synthesis.", "Nucleolus is responsible for ribosome assembly."], pyqs: [], practiceQuestions: ["Explain the fluid mosaic model of cell membrane."] }
        ]
      },
      {
        subject: "Economics",
        description: "Microeconomics basics, consumer behaviors, demand and supply curves.",
        chapters: [
          { id: "c11-e-1", number: 1, title: "Introduction to Microeconomics", summary: "Central problems of an economy, PPC curve, opportunity cost.", notes: ["PPC is concave to the origin due to increasing marginal opportunity cost.", "Central problems: What, how, and for whom to produce."], pyqs: [], practiceQuestions: ["Explain the concept of opportunity cost with an example."] }
        ]
      },
      {
        subject: "History",
        description: "Ancient writing systems, early empires, and world history segments.",
        chapters: [
          { id: "c11-h-1", number: 1, title: "Writing and City Life", summary: "Mesopotamian civilization, cuneiform script, trade and city systems.", notes: ["Mesopotamia lies between Tigris and Euphrates rivers.", "Cuneiform tablets recorded commercial transactions."], pyqs: [], practiceQuestions: ["Why is Mesopotamian writing called cuneiform? What were its uses?"] }
        ]
      },
      {
        subject: "Geography",
        description: "India's physical environment, physiography, and soil resources.",
        chapters: [
          { id: "c11-g-1", number: 1, title: "Physiography", summary: "Geological divisions of India, structure of northern hills.", notes: ["Northern plains are formed by alluvial deposits from Indus, Ganga, Brahmaputra."], pyqs: [], practiceQuestions: ["Briefly explain the geological divisions of the Indian subcontinent."] }
        ]
      },
      {
        subject: "Computer Science",
        description: "Computer structures and Python software language basics.",
        chapters: [
          { id: "c11-cs-1", number: 1, title: "Introduction to Python", summary: "Variables, identifiers, loops (for, while), basic datatypes (lists, dicts).", notes: ["Python is an interpreted, high-level programming language.", "Lists are mutable; tuples are immutable."], pyqs: [], practiceQuestions: ["Write a Python program to check if a number is prime or not."] }
        ]
      }
    ]
  },
  {
    grade: "Class 12",
    streams: ["PCM", "PCB", "Arts", "Commerce"],
    subjects: [
      {
        subject: "Physics",
        description: "Electrostatics, electrodynamics, optics, modern physics, and semiconductors.",
        chapters: [
          { id: "c12-p-1", number: 1, title: "Electrostatics & Electric Charges", summary: "Coulomb's Law, electric field, Gauss's law, electric dipole.", notes: ["Coulomb's Law: F = k*q1*q2 / r².", "Gauss's Law: Total flux = q_enclosed / ε₀."], pyqs: [{ question: "Derive electric field of long straight wire using Gauss Law.", answer: "Gaussian surface is cylinder. E = λ / (2πε₀r).", year: "2023" }], practiceQuestions: ["Define electric dipole moment. State SI unit.", "Calculate the capacitance of a parallel plate capacitor."] },
          { id: "c12-p-2", number: 2, title: "Current Electricity", summary: "Ohm's law, drift velocity, resistivity, Kirchhoff's laws, Wheatstone bridge.", notes: ["Kirchhoff's First Law (Junction): Sum of currents is zero.", "Kirchhoff's Second Law (Loop): Sum of potential differences is zero.", "Drift velocity Vd = eEτ / m."], pyqs: [], practiceQuestions: ["State and explain the principle of a Wheatstone Bridge.", "Define temperature coefficient of resistance."] },
          { id: "c12-p-3", number: 3, title: "Ray Optics and Optical Instruments", summary: "Reflection, refraction, prism, lensmaker's formula, microscopes.", notes: ["Lensmaker's Formula: 1/f = (n-1)(1/R1 - 1/R2).", "Prism formula: n = sin((A + Dm)/2) / sin(A/2)."], pyqs: [], practiceQuestions: ["Derive lensmaker's formula for thin convex lens.", "Explain compound microscope magnification."] }
        ]
      },
      {
        subject: "Chemistry",
        description: "Chemical kinetics, electrochemistry, organic functional groups, coordination compounds.",
        chapters: [
          { id: "c12-c-1", number: 1, title: "Chemical Kinetics", summary: "Reaction rate, order, molecularity, integrated rate equations, Arrhenius theory.", notes: ["Rate Law: Rate = k[A]^x [B]^y.", "Integrated rate of first order reaction: k = (2.303/t) * log([A]₀/[A]).", "Half-life of first-order: t_1/2 = 0.693/k."], pyqs: [{ question: "A reaction is 50% complete in 30 minutes. Find first-order rate constant.", answer: "k = 0.693 / 30 = 0.0231 min^-1.", year: "2024" }], practiceQuestions: ["Distinguish between order and molecularity.", "Explain activation energy and effect of catalyst."] },
          { id: "c12-c-2", number: 2, title: "Electrochemistry", summary: "Galvanic cells, Nernst equation, Kohlrausch's law, electrolysis.", notes: ["Nernst Equation: E = E° - (0.0591/n) * log(Q).", "Kohlrausch's Law: Limiting molar conductivity is sum of individual ion conductivities."], pyqs: [], practiceQuestions: ["Explain charging and discharging of lead storage battery.", "Define cell constant. How is it measured?"] }
        ]
      },
      {
        subject: "Mathematics",
        description: "Relations & functions, matrices, calculus, vectors, 3D geometry, probability.",
        chapters: [
          { id: "c12-m-1", number: 1, title: "Relations and Functions", summary: "Types of relations, equivalence relation, one-one and onto functions.", notes: ["An equivalence relation is reflexive, symmetric, and transitive.", "A function is bijective if it is both injective and surjective."], pyqs: [], practiceQuestions: ["Prove that the relation R in the set of integers given by R = {(a,b) : 2 divides a-b} is an equivalence relation."] },
          { id: "c12-m-2", number: 2, title: "Matrices and Determinants", summary: "Operations, transpose, symmetric, inverse, system of equations.", notes: ["A matrix is symmetric if A = A^T.", "Inverse of matrix A exists if determinant is non-zero (A^-1 = adj(A)/|A|)."], pyqs: [], practiceQuestions: ["Solve the system of equations using matrix method: 2x+3y=5, 6x-y=2."] },
          { id: "c12-m-3", number: 3, title: "Continuity & Differentiability", summary: "Continuity, differentiability, chain rule, implicit functions, Rolle's theorem.", notes: ["If a function is differentiable, it is always continuous.", "Chain rule: d/dx(f(g(x))) = f'(g(x)) * g'(x)."], pyqs: [{ question: "Find dy/dx for y = e^(x²)", answer: "dy/dx = 2x * e^(x²)", year: "2023" }], practiceQuestions: ["Find dy/dx if x² + xy + y² = 100."] }
        ]
      },
      {
        subject: "Biology",
        description: "Reproduction systems, molecular genetics, biotechnology, ecology.",
        chapters: [
          { id: "c12-b-1", number: 1, title: "Molecular Basis of Inheritance", summary: "DNA structure, replication, transcription, translation, genetic code.", notes: ["DNA replication is semi-conservative.", "AUG is the universal start codon (methionine).", "Transcription converts DNA to mRNA."], pyqs: [{ question: "Explain Griffith's transforming principle experiment.", answer: "R-strain and S-strain bacteria injected in mice showing DNA is genetic material.", year: "2023" }], practiceQuestions: ["State features of the genetic code.", "Explain the process of DNA replication in detail."] }
        ]
      },
      {
        subject: "Economics",
        description: "National income, money and banking, macroeconomic frameworks.",
        chapters: [
          { id: "c12-e-1", number: 1, title: "National Income Accounting", summary: "Circular flow of income, double counting, GDP, GNP, NNP calculations.", notes: ["National Income = NNP at Factor Cost.", "Avoid double counting by using the value-added method."], pyqs: [], practiceQuestions: ["Explain the circular flow of income in a two-sector economy."] }
        ]
      },
      {
        subject: "History",
        description: "Archaeology, Harappan, early rulers and Indian history records.",
        chapters: [
          { id: "c12-h-1", number: 1, title: "Bricks, Beads and Bones", summary: "Harappan civilization archaeology, town planning, agricultural technologies.", notes: ["Harappan civilization is famous for its grid-pattern drainage systems.", "Citadel and lower town division of cities."], pyqs: [], practiceQuestions: ["Describe the advanced drainage system of the Harappans."] }
        ]
      },
      {
        subject: "Geography",
        description: "Human geography principles, populations, trade and transport.",
        chapters: [
          { id: "c12-g-1", number: 1, title: "Human Geography", summary: "Nature and scope of human geography, environmental determinism vs possibilism.", notes: ["Possibilism emphasizes human choices in transforming physical surroundings."], pyqs: [], practiceQuestions: ["Explain the difference between environmental determinism and possibilism."] }
        ]
      },
      {
        subject: "Computer Science",
        description: "Advanced Python data structures, computer networking, SQL databases.",
        chapters: [
          { id: "c12-cs-1", number: 1, title: "Computer Networks", summary: "Network topologies, transmission media, protocols (HTTP, TCP/IP, DNS).", notes: ["Star topology connects all devices to central hub.", "TCP/IP manages packets and routing."], pyqs: [{ question: "Explain the differences between LAN, MAN and WAN.", answer: "LAN is local (home/office); MAN is citywide; WAN is global (Internet).", year: "2024" }], practiceQuestions: ["What is DNS? Explain its role in the internet.", "Compare guided and unguided transmission media."] }
        ]
      }
    ]
  }
];

// Complete Subject list with 20 high-quality test questions per grade for the 10-day exams!
export interface TestQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index in options (0-3)
  explanation: string;
  yearHint?: string;
}

export const TEST_BANKS: Record<string, TestQuestion[]> = {
  "Class 9": [
    {
      id: "q9-1",
      subject: "Mathematics",
      question: "Which of the following is an irrational number?",
      options: ["√4", "3.14", "π", "22/7"],
      correctAnswer: 2,
      explanation: "π is an irrational number because its decimal expansion is non-terminating and non-recurring. √4 simplifies to 2, which is rational.",
      yearHint: "CBSE Class 9 Board"
    },
    {
      id: "q9-2",
      subject: "Mathematics",
      question: "The degree of a non-zero constant polynomial is:",
      options: ["0", "1", "Not defined", "Any positive integer"],
      correctAnswer: 0,
      explanation: "A constant polynomial like 5 can be written as 5x^0. Thus, its degree is 0.",
      yearHint: "CBSE Board Practice"
    },
    {
      id: "q9-3",
      subject: "Physics",
      question: "A passenger in a moving train tosses a coin which falls behind him. This means that motion of the train is:",
      options: ["Accelerated", "Uniform", "Retarded", "Along circular tracks"],
      correctAnswer: 0,
      explanation: "If the train accelerates, the coin retains the train's previous slower speed due to inertia, landing behind the passenger.",
      yearHint: "NCERT Exemplar"
    },
    {
      id: "q9-4",
      subject: "Chemistry",
      question: "Which of the following processes represents sublimation?",
      options: ["Water converting to vapor", "Dry Ice converting to Carbon Dioxide gas", "Ice melting into water", "Candle wax melting"],
      correctAnswer: 1,
      explanation: "Sublimation is the direct phase transition from solid to gas. Dry Ice (solid carbon dioxide) sublimates directly into gas at room temperature.",
      yearHint: "CBSE Class 9 Term 1"
    },
    {
      id: "q9-5",
      subject: "Biology",
      question: "Which cell organelle is known as the powerhouse of the cell?",
      options: ["Golgi apparatus", "Lysosomes", "Mitochondria", "Ribosomes"],
      correctAnswer: 2,
      explanation: "Mitochondria are called the powerhouses of the cell because they produce cellular energy in the form of ATP.",
      yearHint: "NCERT Textbook"
    },
    {
      id: "q9-6",
      subject: "History",
      question: "The French Revolution began in which year?",
      options: ["1776", "1789", "1804", "1917"],
      correctAnswer: 1,
      explanation: "The French Revolution broke out in July 1789 with the storming of the Bastille prison.",
      yearHint: "CBSE Social Science"
    },
    {
      id: "q9-7",
      subject: "Geography",
      question: "The easternmost longitude of India is:",
      options: ["97° 25' E", "68° 7' E", "77° 6' E", "82° 32' E"],
      correctAnswer: 0,
      explanation: "The easternmost point of India is located in Arunachal Pradesh at the longitude of 97° 25' E.",
      yearHint: "CBSE National Map Series"
    },
    {
      id: "q9-8",
      subject: "Political Science",
      question: "Who was the chairman of the Drafting Committee of the Indian Constitution?",
      options: ["Dr. Rajendra Prasad", "Jawaharlal Nehru", "Dr. B.R. Ambedkar", "Sardar Vallabhbhai Patel"],
      correctAnswer: 2,
      explanation: "Dr. Bhimrao Ramji Ambedkar chaired the Drafting Committee of the Indian Constitution.",
      yearHint: "Civics Chapter 2"
    },
    {
      id: "q9-9",
      subject: "Economics",
      question: "What is the main production activity in the village Palampur?",
      options: ["Manufacturing", "Transporting", "Farming", "Shopkeeping"],
      correctAnswer: 2,
      explanation: "In the Palampur story, farming is the primary livelihood source employing over 75% of the local people.",
      yearHint: "NCERT Class 9 Econ"
    },
    {
      id: "q9-10",
      subject: "Hindi Grammar",
      question: "'पवन' का सही संधि-विच्छेद क्या होगा?",
      options: ["प + वन", "पौ + अन", "पो + अन", "पव + न"],
      correctAnswer: 2,
      explanation: "अयादि स्वर संधि के नियमानुसार, पो + अन = पवन होता है।",
      yearHint: "Hindi Sanchayan"
    },
    {
      id: "q9-11",
      subject: "English Grammar",
      question: "Identify the correct sentence:",
      options: [
        "Neither of the boys were present.",
        "Neither of the boys was present.",
        "Neither of the boys are present.",
        "Neither of the boys have been present."
      ],
      correctAnswer: 1,
      explanation: "'Neither' is a singular pronoun and requires a singular verb: 'Neither of the boys was present'.",
      yearHint: "CBSE Communicative English"
    },
    {
      id: "q9-12",
      subject: "Computer",
      question: "Which of the following is the brain of the computer?",
      options: ["RAM", "Motherboard", "Central Processing Unit (CPU)", "Hard Disk"],
      correctAnswer: 2,
      explanation: "The CPU is known as the brain because it handles all arithmetic, logic, and operational calculations.",
      yearHint: "Class 9 ICT Foundation"
    }
  ],
  "Class 10": [
    {
      id: "q10-1",
      subject: "Mathematics",
      question: "If HCF(306, 657) = 9, what is the LCM(306, 657)?",
      options: ["22338", "30620", "22104", "18090"],
      correctAnswer: 0,
      explanation: "LCM = (a * b) / HCF = (306 * 657) / 9 = 22338.",
      yearHint: "CBSE Class 10 Board 2022"
    },
    {
      id: "q10-2",
      subject: "Mathematics",
      question: "If sin A = 3/4, then the value of cos A is:",
      options: ["4/3", "√7 / 4", "3/5", "5/4"],
      correctAnswer: 1,
      explanation: "cos A = √(1 - sin² A) = √(1 - 9/16) = √(7/16) = √7 / 4.",
      yearHint: "CBSE Trigonometry Quiz"
    },
    {
      id: "q10-3",
      subject: "Physics",
      question: "The power of a convex lens of focal length 50 cm is:",
      options: ["+2 D", "-2 D", "+0.5 D", "-0.5 D"],
      correctAnswer: 0,
      explanation: "Power P = 1 / f (in meters) = 1 / 0.5m = +2 Dioptres.",
      yearHint: "CBSE Board 2023"
    },
    {
      id: "q10-4",
      subject: "Chemistry",
      question: "Which gas is released when dilute hydrochloric acid is added to zinc granules?",
      options: ["Oxygen", "Carbon Dioxide", "Hydrogen", "Chlorine"],
      correctAnswer: 2,
      explanation: "Zinc reacts with HCl to release Hydrogen gas: Zn + 2HCl -> ZnCl2 + H2 (g). Tested by pop sound test.",
      yearHint: "Acid Bases and Salts Lab"
    },
    {
      id: "q10-5",
      subject: "Biology",
      question: "The kidneys in human beings are a part of the system for:",
      options: ["Nutrition", "Respiration", "Excretion", "Transportation"],
      correctAnswer: 2,
      explanation: "Kidneys filter metabolic waste products out of blood and are the central organs of the human excretion system.",
      yearHint: "Life Processes Chapter"
    },
    {
      id: "q10-6",
      subject: "History",
      question: "Under whose leadership did the Unification of Germany take place?",
      options: ["Otto von Bismarck", "Giuseppe Garibaldi", "Kaiser William I", "Napoleon Bonaparte"],
      correctAnswer: 0,
      explanation: "Prussian Chief Minister Otto von Bismarck was the chief architect of German unification using 'Blood and Iron' policies.",
      yearHint: "Rise of Nationalism in Europe"
    },
    {
      id: "q10-7",
      subject: "Geography",
      question: "Black soil is also known as:",
      options: ["Bangar", "Regur soil", "Arid soil", "Khadar"],
      correctAnswer: 1,
      explanation: "Black soil is highly sticky and moisture-retentive, famously referred to as Regur soil, ideal for cotton farming.",
      yearHint: "CBSE Soils & Resources"
    },
    {
      id: "q10-8",
      subject: "Political Science",
      question: "Which language was declared as the only official language of Sri Lanka in 1956?",
      options: ["Tamil", "Sinhala", "English", "Hindi"],
      correctAnswer: 1,
      explanation: "The 1956 Sinhala Only Act recognized Sinhala as Sri Lanka's sole official language, triggering ethnic friction.",
      yearHint: "Power Sharing Class 10"
    },
    {
      id: "q10-9",
      subject: "Economics",
      question: "Which sector of economy generates the highest employment share in India currently?",
      options: ["Primary Sector (Agriculture)", "Secondary Sector", "Tertiary Sector (Services)", "Quaternary Sector"],
      correctAnswer: 0,
      explanation: "While Tertiary sector yields the highest GDP value, Agriculture (Primary sector) remains India's largest employment provider.",
      yearHint: "Sectors of Indian Economy"
    },
    {
      id: "q10-10",
      subject: "Hindi Grammar",
      question: "'दशानन' में कौन-सा समास है?",
      options: ["द्विगु समास", "द्वंद्व समास", "बहुव्रीहि समास", "कर्मधारय समास"],
      correctAnswer: 2,
      explanation: "दश हैं आनन (मुख) जिसके अर्थात रावण। यहाँ तीसरा पद प्रधान होने के कारण बहुव्रीहि समास है।",
      yearHint: "Hindi Vyakaran Class 10"
    },
    {
      id: "q10-11",
      subject: "English Literature",
      question: "Who wrote the poem 'Fire and Ice'?",
      options: ["Robert Frost", "Leslie Norris", "Robin Klein", "John Berryman"],
      correctAnswer: 0,
      explanation: "The famous poem 'Fire and Ice' exploring global destruction was written by Robert Frost.",
      yearHint: "First Flight Chapter 1"
    },
    {
      id: "q10-12",
      subject: "Computer",
      question: "In HTML, which tag is used to insert a line break?",
      options: ["<lb>", "<break>", "<br>", "<hr>"],
      correctAnswer: 2,
      explanation: "<br> is an empty HTML tag used to start a new text line without creating a paragraph space.",
      yearHint: "HTML CBSE Class 10"
    }
  ],
  "Class 11": [
    {
      id: "q11-1",
      subject: "Physics",
      question: "If the force acting on an object is doubled, the acceleration will:",
      options: ["Remain the same", "Be halved", "Be doubled", "Quadruple"],
      correctAnswer: 2,
      explanation: "By Newton's second law, a = F/m. Thus, doubling the net force doubles the acceleration linearly.",
      yearHint: "Mechanics Session"
    },
    {
      id: "q11-2",
      subject: "Chemistry",
      question: "Which of the following orbitals has the lowest energy?",
      options: ["3d", "4s", "4p", "3p"],
      correctAnswer: 3,
      explanation: "Following (n+l) rule: 3p has n+l = 3+1 = 4. 4s has n+l = 4+0 = 4 (but lower n). 3p is filled before 4s and has lower total energy than others.",
      yearHint: "Structure of Atom"
    },
    {
      id: "q11-3",
      subject: "Mathematics",
      question: "The number of subsets of a set containing n elements is:",
      options: ["2n", "n²", "2^n", "n!"],
      correctAnswer: 2,
      explanation: "A set with cardinal number n has 2^n total power set subsets.",
      yearHint: "Sets & Functions"
    },
    {
      id: "q11-4",
      subject: "Biology",
      question: "The term 'Taxonomy' was coined by which scientist?",
      options: ["Linnaeus", "A.P. de Candolle", "Aristotle", "Bentham"],
      correctAnswer: 1,
      explanation: "Augustin Pyramus de Candolle coined the term Taxonomy in 1813.",
      yearHint: "The Living World"
    },
    {
      id: "q11-5",
      subject: "Economics",
      question: "Who is known as the father of modern economics?",
      options: ["Adam Smith", "Alfred Marshall", "Karl Marx", "Keynes"],
      correctAnswer: 0,
      explanation: "Adam Smith is famously acknowledged as the father of modern economics with his landmark book 'The Wealth of Nations'.",
      yearHint: "Class 11 Microeconomics"
    }
  ],
  "Class 12": [
    {
      id: "q12-1",
      subject: "Physics",
      question: "A spherical shell of radius R has charge Q. The electric field inside the shell is:",
      options: ["kQ/R²", "Zero", "kQ/r", "kQ/2R²"],
      correctAnswer: 1,
      explanation: "Using Gauss Law with radius r < R, there is no enclosed charge inside a hollow conductor, so E = 0.",
      yearHint: "Electrostatic CBSE Board 2023"
    },
    {
      id: "q12-2",
      subject: "Chemistry",
      question: "The rate constant of a first-order reaction depends on:",
      options: ["Concentration of reactants", "Temperature", "Time", "Extent of reaction"],
      correctAnswer: 1,
      explanation: "According to the Arrhenius equation, the rate constant 'k' is strictly dependent on temperature and activation energy.",
      yearHint: "Chemical Kinetics CBSE"
    },
    {
      id: "q12-3",
      subject: "Mathematics",
      question: "The value of dy/dx for y = e^(x²) is:",
      options: ["2x * e^(x²)", "e^(x²)", "x * e^(x²)", "2 * e^(x)"],
      correctAnswer: 0,
      explanation: "Using chain rule: d/dx(e^(x²)) = e^(x²) * d/dx(x²) = 2x * e^(x²).",
      yearHint: "Calculus CBSE Class 12"
    },
    {
      id: "q12-4",
      subject: "Biology",
      question: "Which of the following is the start codon in mRNA translation?",
      options: ["UAG", "AUG", "UGA", "UAA"],
      correctAnswer: 1,
      explanation: "AUG is the universal start codon that codes for Methionine.",
      yearHint: "Molecular Genetics Class 12"
    },
    {
      id: "q12-5",
      subject: "Computer",
      question: "In Python, which function is used to write a string in binary files?",
      options: ["write()", "dump()", "writelines()", "load()"],
      correctAnswer: 1,
      explanation: "In Python's pickle module, pickle.dump() is used to serialize and write binary representations to physical files.",
      yearHint: "Computer Science Python File Handling"
    }
  ]
};
